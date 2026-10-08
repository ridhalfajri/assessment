import type { TreatmentGroupId } from "@/lib/experiment";

/**
 * Override grup treatment untuk pengujian (done criterion BETE-8: "bisa diuji
 * dengan override grup di dev"). Dipakai via query param `?group=1..4` pada
 * dev server (atau E2E) agar 4 varian teks bisa diperiksa tanpa menunggu
 * hasil acak.
 *
 * Di produksi SELALU null — random assignment tidak boleh bisa ditimpa.
 */
export function parseDevGroupOverride(
  raw: string | null | undefined,
  isDevelopment: boolean,
): TreatmentGroupId | null {
  if (!isDevelopment || raw == null || !/^[1-4]$/.test(raw)) return null;
  return Number.parseInt(raw, 10) as TreatmentGroupId;
}
