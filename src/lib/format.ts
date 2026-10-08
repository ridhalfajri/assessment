/**
 * Format Rupiah deterministik ("Rp1.000.000.000") tanpa Intl — tampilan SSR
 * dan client dijamin identik (bebas hydration mismatch) di semua runtime.
 */
export function formatRupiah(amount: number): string {
  const digits = Math.max(0, Math.floor(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${grouped}`;
}
