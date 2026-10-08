/**
 * 14 kasus acuan pajak (PRD 3.4) — konten halaman Information Search (BETE-9).
 *
 * ⚠️ SEMUA NASKAH DI FILE INI MASIH PLACEHOLDER — naskah final 14 kasus
 * referensi belum diserahkan owner. Struktur topik mengikuti konteks skenario
 * PT Cahaya Gama (4 akun biaya bermasalah: jasa konsultasi/know-how,
 * entertainment, perbaikan, pemasaran) agar penempatan peringkat & sitasi
 * sudah bisa diuji end-to-end. Saat naskah final tersedia, TIMPA FILE INI —
 * komponen tidak boleh memuat teks kasus.
 */

export type ReferenceCase = {
  /** ID kasus 1–14; senada `case_logs.case_id` (skema BETE-5). */
  caseId: number;
  /** Judul singkat kasus — tampil di kartu daftar & judul modal. */
  title: string;
  /** Ringkasan 1 kalimat untuk kartu daftar (penggoda sebelum modal dibuka). */
  summary: string;
  /** Isi lengkap kasus, dirender paragraf demi paragraf di dalam modal. */
  paragraphs: string[];
};

/** Jumlah kasus acuan yang wajib tersedia (PRD & skema: tepat 14). */
export const CASE_COUNT = 14;

/** [PLACEHOLDER] Paragraf isi kasus generik — ditimpa naskah final owner. */
function placeholderParagraphs(topic: string): string[] {
  return [
    `[PLACEHOLDER — naskah final Kasus ${topic} akan diserahkan owner] Uraian ` +
      "fakta kasus referensi: landasan peraturan perpajakan yang relevan, " +
      "kondisi yang mensyaratkan deductibilitas biaya, serta batasan-batasan " +
      "nominal atau administratifnya.",
    `[PLACEHOLDER — naskah final Kasus ${topic} akan diserahkan owner] ` +
      "Contoh penerapan, dasar hukum pendukung, dan catatan risiko yang perlu " +
      "dipertimbangkan konsultan saat menyitasi kasus ini dalam rekomendasi.",
  ];
}

export const REFERENCE_CASES: ReferenceCase[] = [
  {
    caseId: 1,
    title: "[PLACEHOLDER] Deductibilitas Biaya Jasa Konsultasi (Know-how Fee)",
    summary: "[PLACEHOLDER] Syarat pembebanan biaya know-how fee sebagai pengurang penghasilan bruto.",
    paragraphs: placeholderParagraphs("1 — know-how fee"),
  },
  {
    caseId: 2,
    title: "[PLACEHOLDER] Biaya Entertainment: Syarat Nominatif & Batasan",
    summary: "[PLACEHOLDER] Pengaturan biaya hiburan (entertainment) yang dapat dan tidak dapat dibebankan.",
    paragraphs: placeholderParagraphs("2 — entertainment"),
  },
  {
    caseId: 3,
    title: "[PLACEHOLDER] Perbaikan vs Pembangunan: Batas Kapitalisasi",
    summary: "[PLACEHOLDER] Pembedaan biaya perbaikan yang dibebankan langsung vs bagian yang dikapitalisasi.",
    paragraphs: placeholderParagraphs("3 — maintenance"),
  },
  {
    caseId: 4,
    title: "[PLACEHOLDER] Biaya Pemasaran & Promosi Penghasilan",
    summary: "[PLACEHOLDER] Kriteria biaya pemasaran yang sah sebagai deductibel dalam fiskal.",
    paragraphs: placeholderParagraphs("4 — marketing"),
  },
  {
    caseId: 5,
    title: "[PLACEHOLDER] Klasifikasi Hutang vs Ekuitas & Konsekuensi Bunganya",
    summary: "[PLACEHOLDER] Dampak klasifikasi pendanaan terhadap deductibilitas beban bunga.",
    paragraphs: placeholderParagraphs("5"),
  },
  {
    caseId: 6,
    title: "[PLACEHOLDER] Prinsip Hubungan Istimewa dalam Transaksi",
    summary: "[PLACEHOLDER] Pengaruh hubungan istimewa terhadap penentuan harga wajar transaksi.",
    paragraphs: placeholderParagraphs("6"),
  },
  {
    caseId: 7,
    title: "[PLACEHOLDER] Transfer Pricing: Metode Penentuan Harga Wajar",
    summary: "[PLACEHOLDER] Metode comparable uncontrolled price, resale price, cost plus, dan lainnya.",
    paragraphs: placeholderParagraphs("7"),
  },
  {
    caseId: 8,
    title: "[PLACEHOLDER] Dokumentasi & Kewajiban Kepatuhan Wajib Pajak",
    summary: "[PLACEHOLDER] Dokumen pendukung yang wajib disiapkan untuk mempertahankan posisi fiskal.",
    paragraphs: placeholderParagraphs("8"),
  },
  {
    caseId: 9,
    title: "[PLACEHOLDER] Objek & Bukan Objek Pajak Penghasilan",
    summary: "[PLACEHOLDER] Pembedaan penghasilan objek pajak, bukan objek pajak, dan penghasilan tahan pajak.",
    paragraphs: placeholderParagraphs("9"),
  },
  {
    caseId: 10,
    title: "[PLACEHOLDER] Penghasilan Kena Pajak & Pengurangan",
    summary: "[PLACEHOLDER] Mekanisme penentuan penghasilan kena pajak dan komponen pengurangnya.",
    paragraphs: placeholderParagraphs("10"),
  },
  {
    caseId: 11,
    title: "[PLACEHOLDER] Tarif & Penghitungan Pajak Penghasilan Badan",
    summary: "[PLACEHOLDER] Tarif umum, fasilitas pasal 31E, dan penghitungan PPh terutang.",
    paragraphs: placeholderParagraphs("11"),
  },
  {
    caseId: 12,
    title: "[PLACEHOLDER] PPN: Pemberi Jasa Kena Pajak & Pengkreditan",
    summary: "[PLACEHOLDER] Syarat PKP, basis pengenaan PPN atas jasa, dan mekanisme pajak masukan.",
    paragraphs: placeholderParagraphs("12"),
  },
  {
    caseId: 13,
    title: "[PLACEHOLDER] Sanksi Administratif & Bunga dalam Ketentuan Pajak",
    summary: "[PLACEHOLDER] Jenis sanksi administratif dan kewajiban pembetulan/penyampaian SPT.",
    paragraphs: placeholderParagraphs("13"),
  },
  {
    caseId: 14,
    title: "[PLACEHOLDER] Bukti Transaksi & Pembayaran melalui Lembaga Penguscana",
    summary: "[PLACEHOLDER] Syarat bukti transaksi dan pembayaran non-tunai melalui lembaga penguscana dana.",
    paragraphs: placeholderParagraphs("14"),
  },
];

/** Ambil kasus acuan berdasarkan ID (1–14). */
export function getReferenceCase(caseId: number): ReferenceCase | undefined {
  return REFERENCE_CASES.find((referenceCase) => referenceCase.caseId === caseId);
}
