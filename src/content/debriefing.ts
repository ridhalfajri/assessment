/**
 * Konten halaman debriefing (BETE-10, PRD 3.8): penjelasan riset yang
 * ditampilkan setelah submit — bagian dari etika penelitian eksperimen
 * (debriefing wajib menjelaskan tujuan sesungguhnya, termasuk treatment yang
 * diterima partisipan, tanpa memberi tombol kembali ke survei).
 *
 * ⚠️ NASKAH FINAL BELUM DISEDIAKAN OWNER — semua teks di bawah bertanda
 * [PLACEHOLDER]. Timpa file ini saja; komponen tidak menyimpan teks.
 */

export const DEBRIEFING_CONTENT = {
  heading: "Terima kasih atas partisipasi Anda",
  /** [PLACEHOLDER] Paragraf pembuka debriefing. */
  introParagraphs: [
    "[PLACEHOLDER — naskah debriefing final akan diserahkan owner] Eksperimen " +
      "yang baru saja Anda ikuti bertujuan mempelajari bagaimana tekanan " +
      "akuntabilitas dan preferensi klien memengaruhi proses pencarian " +
      "informasi serta rekomendasi pajak seorang konsultan.",
  ],
  /** [PLACEHOLDER] Penjelasan desain eksperimen (4 grup treatment). */
  designParagraphs: [
    "[PLACEHOLDER — naskah debriefing final akan diserahkan owner] Tanpa " +
      "sepengetahuan Anda, partisipan dibagi secara acak ke dalam salah satu " +
      "dari empat kondisi eksperimen yang berbeda pada teks skenario dan memo " +
      "manajer. Teks yang Anda terima merupakan bagian dari manipulasi " +
      "eksperimen, bukan penilaian atas pekerjaan Anda.",
  ],
  /** [PLACEHOLDER] Jaminan penggunaan & kerahasiaan data. */
  dataParagraphs: [
    "[PLACEHOLDER — naskah debriefing final akan diserahkan owner] Seluruh " +
      "data Anda dianonimkan, hanya digunakan untuk keperluan penelitian " +
      "akademik, dan tidak akan dibagikan kepada pihak ketiga.",
  ],
  /** [PLACEHOLDER] Insentif pulsa — besaran & mekanisme mengikuti naskah final. */
  incentiveParagraph:
    "[PLACEHOLDER — besaran sesuai naskah riset final] Insentif pulsa akan " +
    "dikirimkan ke Nomor HP yang Anda masukkan pada langkah demografi.",
  /** [PLACEHOLDER] Kontak peneliti untuk pertanyaan lanjutan. */
  contactParagraph:
    "[PLACEHOLDER — kontak peneliti] Apabila Anda memiliki pertanyaan " +
    "mengenai penelitian ini, silakan hubungi peneliti melalui kontak yang " +
    "tercantum pada informed consent.",
} as const;
