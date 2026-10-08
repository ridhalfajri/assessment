#!/usr/bin/env bash
# =============================================================================
# e2e/local-stack.sh — menyiapkan lingkungan lokal untuk suite E2E BETE-11.
#
# Membuat stack kompatibel Supabase 100% LOKAL (tanpa instance produksi):
#   - Postgres 16 (docker bete11-pg, port host 54329) + migrasi 0001–0003
#   - PostgREST (internal) sebagai gateway REST ala Supabase
#   - nginx (bete11-gw, port host 3001) memetakan prefix /rest/v1 → PostgREST
#     sehingga klien supabase-js pada aplikasi Next.js bekerja apa adanya
#   - JWT lokal (anon + service_role) ditulis ke .env.local di root repo
#
# Idempoten: container yang sudah berjalan dipakai ulang; migrasi aman diulang.
# Terakhir: pastikan aplikasi berjalan di :3000 (npm run build && npm start).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

NETWORK="bete11-net"
PG_NAME="bete11-pg"
PGRST_NAME="bete11-postgrest"
GW_NAME="bete11-gw"
PG_HOST_PORT="${PG_HOST_PORT:-54329}"
GW_HOST_PORT="${GW_HOST_PORT:-3001}"
JWT_SECRET="bete11-local-e2e-jwt-secret-0123456789abcdef"

docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"

# --- Postgres ----------------------------------------------------------------
if [ "$(docker inspect -f '{{.State.Running}}' "$PG_NAME" 2>/dev/null)" != "true" ]; then
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$PG_NAME" --network "$NETWORK" \
    -e POSTGRES_PASSWORD=postgres -p "$PG_HOST_PORT:5432" postgres:16 >/dev/null
  echo "Menunggu Postgres siap..."
  until docker exec "$PG_NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
fi

# --- Migrasi (idempoten) ------------------------------------------------------
for f in 0001_init.sql 0002_submit_survey_rpc.sql 0003_manipulation_check.sql 0004_integrity_hardening.sql; do
  docker cp "supabase/migrations/$f" "$PG_NAME:/tmp/$f" >/dev/null
  docker exec "$PG_NAME" psql -U postgres -q -f "/tmp/$f" 2>/dev/null
done
echo "Migrasi diterapkan (idempoten)."

# --- PostgREST (internal saja) ------------------------------------------------
if [ "$(docker inspect -f '{{.State.Running}}' "$PGRST_NAME" 2>/dev/null)" != "true" ]; then
  docker rm -f "$PGRST_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$PGRST_NAME" --network "$NETWORK" \
    -e PGRST_DB_URI="postgres://postgres:postgres@$PG_NAME:5432/postgres" \
    -e PGRST_DB_SCHEMA="public" \
    -e PGRST_DB_ANON_ROLE="anon" \
    -e PGRST_JWT_SECRET="$JWT_SECRET" \
    -e PGRST_SERVER_HOST="*" \
    postgrest/postgrest:latest >/dev/null
fi

# --- Gateway nginx (prefix /rest/v1 ala Supabase) ------------------------------
mkdir -p e2e/gateway
cat > e2e/gateway/nginx.conf <<'EOF'
server {
  listen 80;
  location /rest/v1/ {
    proxy_pass http://bete11-postgrest:3000/;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header apikey $http_apikey;
    client_max_body_size 10m;
  }
}
EOF
if [ "$(docker inspect -f '{{.State.Running}}' "$GW_NAME" 2>/dev/null)" != "true" ]; then
  docker rm -f "$GW_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$GW_NAME" --network "$NETWORK" -p "$GW_HOST_PORT:80" \
    -v "$PWD/e2e/gateway/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine >/dev/null
fi

# --- JWT lokal + .env.local -----------------------------------------------------
KEYS=$(node -e '
const crypto = require("crypto");
const SECRET = process.argv[1];
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (role) => {
  const h = b64u({ alg: "HS256", typ: "JWT" });
  const p = b64u({ role, iss: "supabase-demo", iat: Math.floor(Date.now()/1000)-3600, exp: Math.floor(Date.now()/1000)+315360000 });
  return h + "." + p + "." + crypto.createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
};
console.log(sign("anon") + "\n" + sign("service_role"));
' "$JWT_SECRET")
ANON_KEY=$(echo "$KEYS" | head -1)
SERVICE_KEY=$(echo "$KEYS" | tail -1)

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:$GW_HOST_PORT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE=$SERVICE_KEY
# Suite e2e menembak banyak submit dari satu IP localhost — naikkan kuota
# rate limit (produksi tetap default 30/5 menit per IP).
RATE_LIMIT_MAX_REQUESTS=100000
EOF
chmod 600 .env.local
echo ".env.local ditulis (kredensial lokal, tidak di-commit)."

# --- Verifikasi RPC lewat jalur yang sama seperti aplikasi ----------------------
sleep 2
RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:$GW_HOST_PORT/rest/v1/rpc/submit_survey" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" -d '{"p_payload":{"sessionData":{"participantId":"11111111-1111-4111-8111-111111111111","treatmentGroupId":1,"globalTimeRemaining":1,"currentStep":5},"caseLogs":[{"caseId":1,"durationSeconds":0,"isSaved":false,"rank":1}],"recommendations":{"knowHowFee":0,"entertainment":0,"maintenance":0,"marketing":0,"confidenceLevel":0},"questionnaire":{"q1":"x","q2":"x","q3":"x","manipulationCheck":1},"demographics":{"username":"stack_probe","age":1,"gender":"x","education":"x","affiliation":"x","phoneNumber":"081234567890"},"isComplete":false}}')
if [ "$RES" != "200" ]; then
  echo "PERINGATAN: probe RPC mengembalikan HTTP $RES — cek container $PGRST_NAME/$GW_NAME." >&2
else
  docker exec "$PG_NAME" psql -U postgres -q -c "delete from participants where username='stack_probe'" >/dev/null
  echo "Probe RPC OK (gateway REST kompatibel Supabase aktif di http://localhost:$GW_HOST_PORT)."
fi

echo
echo "Stack lokal siap:"
echo "  - Postgres : docker exec $PG_NAME psql -U postgres  (host: localhost:$PG_HOST_PORT)"
echo "  - Gateway  : http://localhost:$GW_HOST_PORT/rest/v1  (NEXT_PUBLIC_SUPABASE_URL)"
echo "  - Aplikasi : npm run build && npm start  (http://localhost:3000)"
echo "  - Suite    : npm run e2e"
