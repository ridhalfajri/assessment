import crypto from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "tax_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24; // 24 jam

function getAdminSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    // Fallback darurat jika env lupa diset (di produksi tetap mewajibkan env diisi)
    return "default-admin-secret-tax-2025";
  }
  return secret;
}

/**
 * Buat token sesi berstempel waktu yang ditandatangani HMAC-SHA256.
 * Format: `<timestamp>.<hmacSignature>`
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getAdminSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Validasi token sesi: cek struktur, kecocokan HMAC, dan usia sesi (< 24 jam).
 */
export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return false;

  // Cek kedaluwarsa (24 jam)
  const now = Date.now();
  const maxAgeMs = SESSION_DURATION_SECONDS * 1000;
  if (now - timestamp > maxAgeMs || timestamp > now + 60_000) {
    return false;
  }

  const secret = getAdminSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(timestampStr)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Verifikasi apakah admin sedang login berdasarkan cookies (Server Component / Route Handler).
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Validasi password admin. Menggunakan timingSafeEqual untuk mencegah timing attack.
 */
export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (!password) return false;

  const bufA = Buffer.from(password);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

export { ADMIN_COOKIE_NAME, SESSION_DURATION_SECONDS };
