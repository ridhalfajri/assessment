/**
 * Opsi jawaban form demografi (BETE-10, PRD 3.7).
 *
 * ⚠️ Daftar opsi masih placeholder — kategori final (terutama pendidikan &
 * afiliasi) mengikuti instrumen riset dari owner. Timpa file ini saja;
 * komponen tidak menyimpan daftar opsi.
 *
 * No. HP tidak butuh opsi: divalidasi dengan aturan format Indonesia yang sama
 * dengan API (lihat getDemographicsFieldErrors di src/lib/submit-client.ts).
 */

export const GENDER_OPTIONS = ["Laki-laki", "Perempuan"] as const;

/** [PLACEHOLDER] Jenjang pendidikan — sesuaikan dengan instrumen final owner. */
export const EDUCATION_OPTIONS = ["SMA/SMK", "D3", "S1", "S2", "S3"] as const;
