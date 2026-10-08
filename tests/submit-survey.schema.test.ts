import { describe, expect, it } from "vitest";
import { submitSurveyPayloadSchema } from "@/lib/submit-survey";
import { buildPartialRankPayload, buildValidPayload } from "./helpers/payload";

const schema = submitSurveyPayloadSchema;

describe("submitSurveyPayloadSchema — payload valid", () => {
  it("menerima payload valid lengkap", () => {
    const result = schema.safeParse(buildValidPayload());
    expect(result.success).toBe(true);
  });

  it("menerima auto-submit dengan sebagian kasus belum diranking (rank null)", () => {
    const result = schema.safeParse(buildPartialRankPayload());
    expect(result.success).toBe(true);
  });

  it("menerima rank null eksplisit dan rank yang tidak dikirim", () => {
    const payload = buildValidPayload();
    payload.caseLogs[3].rank = null;
    delete (payload.caseLogs[4] as { rank?: number }).rank;
    expect(schema.safeParse(payload).success).toBe(true);
  });

  it("trim string kuesioner dan demografi", () => {
    const payload = buildValidPayload();
    payload.questionnaire.q1 = "  Pasal 6 UU PPh  ";
    payload.demographics.username = "  budi  ";
    payload.demographics.gender = " Laki-laki ";
    const result = schema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.questionnaire.q1).toBe("Pasal 6 UU PPh");
      expect(result.data.demographics.username).toBe("budi");
      expect(result.data.demographics.gender).toBe("Laki-laki");
    }
  });

  it("menerima dan menormalkan variasi format No. HP Indonesia", () => {
    // spasi/strip dibuang; bentuk 08/62/+62 disimpan apa adanya
    const cases: Array<[string, string]> = [
      ["081234567890", "081234567890"],
      ["+6281234567890", "+6281234567890"],
      ["6281234567890", "6281234567890"],
      ["0812 3456-7890", "081234567890"],
    ];
    for (const [phone, expected] of cases) {
      const payload = buildValidPayload();
      payload.demographics.phoneNumber = phone;
      const result = schema.safeParse(payload);
      expect(result.success, `phone: ${phone}`).toBe(true);
      if (result.success) {
        expect(result.data.demographics.phoneNumber).toBe(expected);
      }
    }
  });

  it("membuang field di luar kontrak (unknown keys)", () => {
    const raw = buildValidPayload() as Record<string, unknown>;
    raw.injected = "x";
    raw.sessionData = { ...buildValidPayload().sessionData, injected: "y" };
    const result = schema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("injected" in result.data).toBe(false);
      expect("injected" in result.data.sessionData).toBe(false);
    }
  });
});

describe("submitSurveyPayloadSchema — sessionData", () => {
  it("menolak participantId bukan UUID", () => {
    const payload = buildValidPayload();
    payload.sessionData.participantId = "bukan-uuid";
    const result = schema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("participantId");
    }
  });

  it.each([0, 5, 2.5, "2", null])("menolak treatmentGroupId %p", (value) => {
    const payload = buildValidPayload();
    (payload.sessionData as Record<string, unknown>).treatmentGroupId = value;
    expect(schema.safeParse(payload).success).toBe(false);
  });

  it.each([-1, 2401, 1.5])("menolak globalTimeRemaining %p", (value) => {
    const payload = buildValidPayload();
    (payload.sessionData as Record<string, unknown>).globalTimeRemaining = value;
    expect(schema.safeParse(payload).success).toBe(false);
  });
});

describe("submitSurveyPayloadSchema — caseLogs", () => {
  it("menolak array bukan 14 entri", () => {
    for (const count of [0, 2, 13]) {
      const payload = buildValidPayload();
      payload.caseLogs = payload.caseLogs.slice(0, count);
      expect(schema.safeParse(payload).success, `count: ${count}`).toBe(false);
    }

    // lebih dari 14: duplikasi entri
    const tooMany = buildValidPayload();
    tooMany.caseLogs = [...tooMany.caseLogs, { ...tooMany.caseLogs[0], caseId: 14 }];
    expect(schema.safeParse(tooMany).success).toBe(false);
  });

  it("menolak caseId duplikat atau di luar 1–14", () => {
    const duplicate = buildValidPayload();
    duplicate.caseLogs[13].caseId = 1;
    expect(schema.safeParse(duplicate).success).toBe(false);

    const outOfRange = buildValidPayload();
    outOfRange.caseLogs[0].caseId = 15;
    expect(schema.safeParse(outOfRange).success).toBe(false);

    const zero = buildValidPayload();
    zero.caseLogs[0].caseId = 0;
    expect(schema.safeParse(zero).success).toBe(false);
  });

  it("menolak rank duplikat", () => {
    const payload = buildValidPayload();
    payload.caseLogs[1].rank = payload.caseLogs[0].rank;
    const result = schema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("unik"))).toBe(true);
    }
  });

  it("menolak rank di luar 1–14", () => {
    for (const rank of [0, 15, 1.5]) {
      const payload = buildValidPayload();
      payload.caseLogs[0].rank = rank as number;
      expect(schema.safeParse(payload).success, `rank: ${rank}`).toBe(false);
    }
  });

  it("menolak durationSeconds negatif", () => {
    const payload = buildValidPayload();
    payload.caseLogs[0].durationSeconds = -1;
    expect(schema.safeParse(payload).success).toBe(false);
  });
});

describe("submitSurveyPayloadSchema — recommendations", () => {
  it("menolak confidenceLevel di luar 0–100", () => {
    for (const value of [-1, 101, 99.5]) {
      const payload = buildValidPayload();
      (payload.recommendations as Record<string, unknown>).confidenceLevel = value;
      expect(schema.safeParse(payload).success, `confidence: ${value}`).toBe(false);
    }
  });

  it("menolak biaya negatif atau non-integer", () => {
    for (const field of ["knowHowFee", "entertainment", "maintenance", "marketing"] as const) {
      const payload = buildValidPayload();
      (payload.recommendations as Record<string, unknown>)[field] = -5;
      expect(schema.safeParse(payload).success, `${field} negatif`).toBe(false);

      (payload.recommendations as Record<string, unknown>)[field] = 10.5;
      expect(schema.safeParse(payload).success, `${field} desimal`).toBe(false);
    }
  });
});

describe("submitSurveyPayloadSchema — questionnaire & demographics", () => {
  it("menolak jawaban kuesioner kosong / whitespace / lebih dari 1000 karakter", () => {
    const empty = buildValidPayload();
    empty.questionnaire.q2 = "   ";
    expect(schema.safeParse(empty).success).toBe(false);

    const tooLong = buildValidPayload();
    tooLong.questionnaire.q3 = "a".repeat(1001);
    expect(schema.safeParse(tooLong).success).toBe(false);
  });

  it("menolak usia di luar 10–120", () => {
    for (const age of [9, 121, 28.5]) {
      const payload = buildValidPayload();
      (payload.demographics as Record<string, unknown>).age = age;
      expect(schema.safeParse(payload).success, `age: ${age}`).toBe(false);
    }
  });

  it("menolak username/affiliation kosong (kolom NOT NULL di skema)", () => {
    const noUsername = buildValidPayload();
    noUsername.demographics.username = "  ";
    expect(schema.safeParse(noUsername).success).toBe(false);

    const noAffiliation = buildValidPayload();
    noAffiliation.demographics.affiliation = "";
    expect(schema.safeParse(noAffiliation).success).toBe(false);
  });

  it("menolak No. HP format asing / terlalu pendek / huruf", () => {
    for (const phone of ["12345", "+1234567890", "08123456", "08a234567890", "+62-812@@"]) {
      const payload = buildValidPayload();
      payload.demographics.phoneNumber = phone;
      expect(schema.safeParse(payload).success, `phone: ${phone}`).toBe(false);
    }
  });
});
