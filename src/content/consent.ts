/**
 * Konten halaman Login & Informed Consent (PRD 3.1).
 *
 * ⚠️ Naskah riset final (teks consent resmi, besaran insentif pulsa, kontak
 * peneliti) belum diserahkan owner — bagian bertanda [PLACEHOLDER] di bawah
 * adalah draft standar yang wajib ditimpa naskah final. Timpa file ini saja;
 * komponen tidak menyimpan teks consent.
 */

export const CONSENT_CONTENT = {
  welcomeHeading: "Selamat datang, Partisipan",
  welcomeIntro:
    "Terima kasih atas kesediaan Anda mengikuti penelitian eksperimen " +
    "akuntansi keprilakuan. Masukkan username yang diberikan peneliti, baca " +
    "informed consent berikut, lalu berikan persetujuan untuk memulai.",
  usernameLabel: "Username",
  usernameHint: "Gunakan username yang diberikan peneliti (maks. 100 karakter).",
  usernameError: "Username wajib diisi sebelum memulai.",

  consentHeading: "Informed Consent",
  /**
   * [PLACEHOLDER] Draft informed consent standar — ganti dengan naskah resmi
   * dari owner.
   */
  consentParagraphs: [
    "[PLACEHOLDER — naskah final akan diserahkan owner] Anda diundang untuk " +
      "berpartisipasi dalam penelitian tentang pengambilan keputusan " +
      "pajak. Penelitian ini berlangsung sekitar 40 menit dengan timer " +
      "global yang tidak dapat dijeda.",
    "[PLACEHOLDER — naskah final akan diserahkan owner] Partisipasi Anda " +
      "bersifat sukarela. Seluruh data dikumpulkan untuk keperluan " +
      "penelitian, dianonimkan, dan dijaga kerahasiaannya.",
    "[PLACEHOLDER — naskah final akan diserahkan owner] Alur eksperimen " +
      "bersifat satu arah: Anda tidak dapat kembali ke halaman " +
      "sebelumnya, dan jawaban yang sudah disimpan tidak dapat diubah.",
  ],
  /** [PLACEHOLDER] Besaran insentif mengikuti naskah riset final dari owner. */
  incentiveText:
    "[PLACEHOLDER — besaran sesuai naskah riset final] Sebagai apresiasi " +
    "atas waktu Anda, Anda akan menerima insentif pulsa setelah " +
    "menyelesaikan seluruh rangkaian eksperimen. Nomor HP Anda diminta di " +
    "akhir sesi semata untuk distribusi insentif ini.",
  consentCheckboxLabel:
    "Saya telah membaca dan memahami penjelasan di atas, dan saya bersedia " +
    "mengikuti eksperimen ini secara sukarela.",
  consentError: "Persetujuan (checkbox) wajib dicentang sebelum memulai.",

  startButtonLabel: "Mulai Eksperimen",
  startButtonHint:
    "Tombol mulai aktif setelah username terisi dan checkbox persetujuan " +
    "dicentang. Timer 40 menit mulai berjalan saat Anda menekan tombol ini.",
  resumeHeading: "Sesi masih berjalan",
  resumeBody:
    "Kami menemukan sesi eksperimen yang belum selesai di perangkat ini. " +
    "Waktu Anda terus berjalan — lanjutkan dari langkah terakhir Anda.",
  resumeButtonLabel: "Lanjutkan Eksperimen",
  expiredHeading: "Waktu eksperimen telah habis",
  expiredBody:
    "Timer global telah mencapai 00:00 dan jawaban yang sudah terisi telah " +
    "dikirim. Silakan lanjut ke halaman debriefing.",
  expiredButtonLabel: "Ke Halaman Debriefing",
  submittedBody: "Eksperimen Anda sudah selesai. Terima kasih atas partisipasi Anda.",
  submittedButtonLabel: "Lihat Debriefing",
};
