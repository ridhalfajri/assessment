/**
 * Format Rupiah deterministik ("Rp1.000.000.000") tanpa Intl — tampilan SSR
 * dan client dijamin identik (bebas hydration mismatch) di semua runtime.
 */
export function formatRupiah(amount: number): string {
  const digits = Math.max(0, Math.floor(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${grouped}`;
}

/** Batas digit input nilai Rupiah: 13 digit = 9.999.999.999.999, masih jauh
 * di bawah BIGINT dan di atas kebutuhan kasus Rp1.000.000.000. */
export const RUPIAH_INPUT_MAX_DIGITS = 13;

/**
 * Parse input nilai Rupiah berformat ribuan (mis. "1.250.000", "1250000",
 * "1,250,000") menjadi angka non-negatif. Karakter selain digit dan pemisah
 * ribuan ditolak; tanpa digit → null (belum valid). Menjaga agar dispatch ke
 * context selalu angka bersih yang lolos validasi API (zod: int ≥ 0).
 */
export function parseRupiahInput(raw: string): number | null {
  const cleaned = raw.replace(/[.,\s]/g, "");
  if (cleaned.length === 0 || !/^\d+$/.test(cleaned)) return null;
  const value = Number.parseInt(cleaned, 10);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

/**
 * Kelompokkan digit menjadi format ribuan titik saat diketik ("1250000" →
 * "1.250.000"). Bukan-digit dibuang; string kosong dikembalikan apa adanya.
 */
export function groupDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, RUPIAH_INPUT_MAX_DIGITS);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
