/**
 * Butir kuesioner (BETE-10, PRD 3.6): 3 pertanyaan pilihan ganda pengetahuan
 * perpajakan (disimpan ke q1–q3) + skala Likert 1–5 untuk manipulation check.
 *
 * ⚠️ SEMUA BUTIR MASIH PLACEHOLDER — butir final + opsi jawabannya akan
 * diserahkan owner (riset). Saat naskah final tersedia, TIMPA FILE INI saja;
 * komponen kuesioner tidak menyimpan teks pertanyaan.
 *
 * Konvensi penyimpanan jawaban (mengikuti payload arsitektur BETE-2):
 *  - Pilihan ganda: disimpan TEKS OPSI lengkap yang dipilih (mis. "Pasal 6
 *    dan 9 UU PPh"), bukan indeks — analisis riset membaca teksnya.
 *  - Likert: disimpan angka 1–5 (1 = Sangat Tidak Setuju, 5 = Sangat Setuju).
 */

export type KnowledgeQuestionId = "q1" | "q2" | "q3";

export type KnowledgeQuestion = {
  id: KnowledgeQuestionId;
  /** Urutan tampil di halaman (q1 dulu). */
  number: number;
  prompt: string;
  options: string[];
};

export type LikertQuestion = {
  id: "manipulationCheck";
  prompt: string;
};

/** Label skala Likert 1–5; indeks array = nilai - 1. */
export const LIKERT_LABELS = [
  "Sangat Tidak Setuju",
  "Tidak Setuju",
  "Netral",
  "Setuju",
  "Sangat Setuju",
] as const;

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

/** [PLACEHOLDER] 3 butir pengetahuan perpajakan — contoh mengikuti tema kasus. */
export const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  {
    id: "q1",
    number: 1,
    prompt:
      "[PLACEHOLDER — butir final akan diserahkan owner] Dasar hukum pengurangan " +
      "biaya usaha dalam menghitung pajak penghasilan badan adalah…",
    options: [
      "Pasal 6 dan 9 UU PPh",
      "Pasal 4 ayat (1) UU PPh",
      "Pasal 23 UU PPh",
      "PP 55 Tahun 2022",
    ],
  },
  {
    id: "q2",
    number: 2,
    prompt:
      "[PLACEHOLDER — butir final akan diserahkan owner] Berdasarkan ketentuan " +
      "transfer pricing, pihak-pihak yang memiliki hubungan istimewa adalah…",
    options: [
      "Terdapat hubungan istimewa",
      "Tidak terdapat hubungan istimewa",
      "Hanya hubungan transaksi bisnis biasa",
      "Holding company dan pesaing bisnisnya",
    ],
  },
  {
    id: "q3",
    number: 3,
    prompt:
      "[PLACEHOLDER — butir final akan diserahkan owner] Biaya hiburan " +
      "(entertainment) yang dapat dikurangkan dari penghasilan bruto adalah…",
    options: [
      "Semua biaya entertainment yang dilengkapi daftar nominatif",
      "Semua biaya entertainment tanpa syarat",
      "Biaya entertainment hanya untuk karyawan internal",
      "Biaya entertainment tidak dapat dikurangkan sama sekali",
    ],
  },
];

/** [PLACEHOLDER] Butir manipulation check (skala Likert 1–5). */
export const MANIPULATION_CHECK_QUESTION: LikertQuestion = {
  id: "manipulationCheck",
  prompt:
    "[PLACEHOLDER — butir final akan diserahkan owner] Selama mengerjakan kasus " +
    "ini, saya merasa rekomendasi saya akan dievaluasi dan saya harus dapat " +
    "mempertanggungjawabkannya.",
};
