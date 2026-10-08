import type { TreatmentGroupId } from "@/lib/experiment";

/**
 * Matriks teks treatment (BETE-8) — sumber teks skenario dinamis Halaman 1.
 *
 * Desain eksperimen 2×2 (dokumen arsitektur, thread komentar BETE-2):
 *   - Variabel 1 — Preferensi Klien: implisit / eksplisit (teks PT Cahaya Gama).
 *   - Variabel 2 — Tekanan Akuntabilitas: lemah / kuat (teks Memo Manajer).
 *
 *   Grup 1: Implisit–Lemah | Grup 2: Eksplisit–Lemah
 *   Grup 3: Implisit–Kuat  | Grup 4: Eksplisit–Kuat
 *
 * ⚠️ SEMUA TEKS DI FILE INI MASIH PLACEHOLDER — naskah riset final per grup
 * belum diserahkan owner (dokumen terpotong "…"). Fragmen di bawah hanya
 * mengikuti struktur matriks. Saat naskah final tersedia, TIMPA FILE INI —
 * komponen tidak boleh memuat teks treatment.
 *
 * Paragraf yang berbagi kondisi yang sama antar grup (1≡3 dan 2≡4 untuk
 * preferensi klien; 1≡2 dan 3≡4 untuk memo) sengaja merujuk konstanta yang
 * sama — struktur faktorial 2×2 yang sebenarnya, dan diverifikasi unit test.
 */

export type ClientPreferenceCondition = "implisit" | "eksplisit";
export type AccountabilityCondition = "lemah" | "kuat";

export type TreatmentContent = {
  groupId: TreatmentGroupId;
  /** Nama kondisi sesuai matriks, mis. "Implisit – Lemah". HANYA untuk
   * keperluan dev/QA (banner override) — jangan pernah dirender ke partisipan. */
  label: string;
  clientPreference: ClientPreferenceCondition;
  accountability: AccountabilityCondition;
  /** Paragraf teks preferensi klien pada skenario PT Cahaya Gama (Variabel 1). */
  clientPreferenceParagraphs: string[];
  /** Paragraf isi memo manajer (Variabel 2). */
  memoParagraphs: string[];
};

// --- Variabel 1: Preferensi Klien (teks skenario PT Cahaya Gama) -----------

// [PLACEHOLDER] Fragmen matriks: "…akan sangat diperhatikan dan dievaluasi…"
const CLIENT_PREFERENCE_IMPLISIT = [
  "[PLACEHOLDER — naskah final Grup implisit akan diserahkan owner] " +
    "Klien menyatakan bahwa saran-saran dan penyesuaian yang diberikan akan " +
    "sangat diperhatikan dan dievaluasi…",
] as const;

// [PLACEHOLDER] Fragmen matriks: "Klien menginginkan posisi tertentu… akan lebih disukai."
const CLIENT_PREFERENCE_EKSPLISIT = [
  "[PLACEHOLDER — naskah final Grup eksplisit akan diserahkan owner] " +
    "Klien menginginkan posisi tertentu… Saran yang konsisten dengan draft " +
    "usulan PT Cahaya Gama akan lebih disukai.",
] as const;

// --- Variabel 2: Tekanan Akuntabilitas (teks Memo Manajer) -----------------

// [PLACEHOLDER] Fragmen matriks (akuntabilitas lemah): rekomendasi diperbolehkan anonim.
const MEMO_AKUNTABILITAS_LEMAH = [
  "[PLACEHOLDER — naskah final akuntabilitas lemah akan diserahkan owner] " +
    "Anda tidak harus mencantumkan nama dan alamat email Anda. Rekomendasi " +
    "diperbolehkan anonim…",
] as const;

// [PLACEHOLDER] Fragmen matriks (akuntabilitas kuat): identitas asli + balikan formal.
const MEMO_AKUNTABILITAS_KUAT = [
  "[PLACEHOLDER — naskah final akuntabilitas kuat akan diserahkan owner] " +
    "Anda harus mencantumkan nama dan email. Anda akan mendapat balikan " +
    "formal dan komentar spesifik dari manajer.",
] as const;

// --- Objek per grup ---------------------------------------------------------

export const TREATMENTS: Record<TreatmentGroupId, TreatmentContent> = {
  1: {
    groupId: 1,
    label: "Implisit – Lemah",
    clientPreference: "implisit",
    accountability: "lemah",
    clientPreferenceParagraphs: [...CLIENT_PREFERENCE_IMPLISIT],
    memoParagraphs: [...MEMO_AKUNTABILITAS_LEMAH],
  },
  2: {
    groupId: 2,
    label: "Eksplisit – Lemah",
    clientPreference: "eksplisit",
    accountability: "lemah",
    clientPreferenceParagraphs: [...CLIENT_PREFERENCE_EKSPLISIT],
    memoParagraphs: [...MEMO_AKUNTABILITAS_LEMAH],
  },
  3: {
    groupId: 3,
    label: "Implisit – Kuat",
    clientPreference: "implisit",
    accountability: "kuat",
    clientPreferenceParagraphs: [...CLIENT_PREFERENCE_IMPLISIT],
    memoParagraphs: [...MEMO_AKUNTABILITAS_KUAT],
  },
  4: {
    groupId: 4,
    label: "Eksplisit – Kuat",
    clientPreference: "eksplisit",
    accountability: "kuat",
    clientPreferenceParagraphs: [...CLIENT_PREFERENCE_EKSPLISIT],
    memoParagraphs: [...MEMO_AKUNTABILITAS_KUAT],
  },
};

/** Ambil konten treatment untuk grup hasil random assignment. */
export function getTreatmentContent(groupId: TreatmentGroupId): TreatmentContent {
  return TREATMENTS[groupId];
}
