/**
 * Rate limiter fixed-window in-memory per klien untuk POST /api/submit-survey
 * (BETE-13 audit). Endpoint ini publik & tanpa autentikasi (partisipan tidak
 * punya akun), jadi ini penghalang utama spam submit / data pollution.
 *
 * Batasan yang disengaja (dokumentasi audit BETE-13):
 *  - In-memory per proses/instance: efektif pada deployment single-instance
 *    (Vercel Node function); tidak dibagikan antar instance. Untuk jaminan
 *    lintas-instance, pasang WAF/edge rate limit di platform (rekomendasi).
 *  - Kunci berasal dari header proxy platform (x-forwarded-for/x-real-ip)
 *    yang ditulis ulang Vercel; pemalsuan header di luar platform bukan
 *    vektor di sini.
 *  - Batas longgar (30 request / 5 menit per IP) agar partisipan di satu
 *    NAT lab/kampus (IP sama) tidak saling mengunci.
 */

/** Panjang jendela pembatasan. */
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Maksimum request per jendela per klien. Default 30 (produksi); bisa
 * dinaikkan lewat env `RATE_LIMIT_MAX_REQUESTS` untuk lingkungan uji atau
 * lab/kampus yang memang berbagi satu IP (lihat e2e/local-stack.sh).
 */
export const RATE_LIMIT_MAX_REQUESTS = Math.max(
  1,
  Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "", 10) || 30,
);

/** Batas ukuran map — cegah pertumbuhan memori tak terbatas (DoS sendiri). */
const MAX_TRACKED_KEYS = 10_000;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export type RateLimitDecision = {
  allowed: boolean;
  /** Detik sampai jendela reset (hanya relevan saat allowed=false). */
  retryAfterSeconds: number;
};

/**
 * Catat satu request untuk `key` (IP klien) pada waktu `nowMs` dan putuskan
 * apakah masih dalam kuota. `nowMs` bisa disuntik untuk pengujian.
 */
export function checkRateLimit(key: string, nowMs: number = Date.now()): RateLimitDecision {
  if (buckets.size >= MAX_TRACKED_KEYS) {
    for (const [k, bucket] of buckets) {
      if (nowMs - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (bucket === undefined || nowMs - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: nowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (bucket.windowStart + RATE_LIMIT_WINDOW_MS - nowMs) / 1000,
      ),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Hanya untuk pengujian: kosongkan semua bucket. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
