import { describe, expect, it } from "vitest";
import {
  computeElapsedSeconds,
  countRankedCases,
  findRankOwner,
  getCaseLog,
  isStep2GateSatisfied,
  RANK_MAX,
  RANK_MIN,
} from "@/lib/case-tracking";
import type { CaseLog } from "@/lib/experiment";

const OPENED_AT_MS = 1_700_000_000_000;

function log(caseId: number, rank: number | null, overrides: Partial<CaseLog> = {}): CaseLog {
  return { caseId, durationSeconds: 10, isSaved: false, rank, ...overrides };
}

describe("computeElapsedSeconds — stopwatch wall-clock kumulatif", () => {
  it("menambahkan selisih jam dinding ke durasi dasar (dipotong ke bawah per detik)", () => {
    expect(computeElapsedSeconds(30, OPENED_AT_MS, OPENED_AT_MS + 0)).toBe(30);
    expect(computeElapsedSeconds(30, OPENED_AT_MS, OPENED_AT_MS + 999)).toBe(30);
    expect(computeElapsedSeconds(30, OPENED_AT_MS, OPENED_AT_MS + 1_000)).toBe(31);
    expect(computeElapsedSeconds(30, OPENED_AT_MS, OPENED_AT_MS + 12_345)).toBe(42);
  });

  it("durasi dasar 0 (kasus pertama kali dibuka) tetap benar", () => {
    expect(computeElapsedSeconds(0, OPENED_AT_MS, OPENED_AT_MS + 5_000)).toBe(5);
  });

  it("jam dinding mundur (mis. sinkronisasi jam) → kembalikan durasi dasar", () => {
    expect(computeElapsedSeconds(30, OPENED_AT_MS, OPENED_AT_MS - 60_000)).toBe(30);
  });

  it("durasi dasar negatif tidak pernah terjadi (dipotong ke 0)", () => {
    expect(computeElapsedSeconds(-5, OPENED_AT_MS, OPENED_AT_MS + 1_000)).toBe(1);
  });

  it("wall-clock: waktu panjang tetap terhitung penuh (tab background)", () => {
    // 3 menit penuh dihitung walau interval tick di-throttle browser.
    expect(computeElapsedSeconds(0, OPENED_AT_MS, OPENED_AT_MS + 180_000)).toBe(180);
  });
});

describe("findRankOwner — penolakan peringkat ganda", () => {
  const logs = [log(1, 3), log(2, 7), log(3, null)];

  it("mengembalikan pemilik peringkat yang sudah dipakai", () => {
    expect(findRankOwner(logs, 3)).toBe(1);
    expect(findRankOwner(logs, 7)).toBe(2);
  });

  it("mengembalikan null untuk peringkat yang masih bebas", () => {
    expect(findRankOwner(logs, 1)).toBeNull();
    expect(findRankOwner(logs, 14)).toBeNull();
  });

  it("mengabaikan kasus yang dikecualikan (peringkat milik kasus itu sendiri)", () => {
    expect(findRankOwner(logs, 3, 1)).toBeNull();
    expect(findRankOwner(logs, 3, 2)).toBe(1);
  });
});

describe("getCaseLog", () => {
  it("mengembalikan log kasus yang ada dan undefined yang belum ada", () => {
    const logs = [log(4, 1)];
    expect(getCaseLog(logs, 4)).toEqual({ caseId: 4, durationSeconds: 10, isSaved: false, rank: 1 });
    expect(getCaseLog(logs, 5)).toBeUndefined();
  });
});

describe("isStep2GateSatisfied — gerbang navigasi ke step-3", () => {
  it("lengkap bila 14 kasus punya log dengan peringkat permutasi 1–14", () => {
    const full = Array.from({ length: 14 }, (_, index) => log(index + 1, ((index + 5) % 14) + 1));
    expect(isStep2GateSatisfied(full, 14)).toBe(true);
    const identity = Array.from({ length: 14 }, (_, index) => log(index + 1, index + 1));
    expect(isStep2GateSatisfied(identity, 14)).toBe(true);
  });

  it("belum lengkap bila ada kasus tanpa log", () => {
    const logs = Array.from({ length: 13 }, (_, index) => log(index + 1, index + 1)); // kasus 14 absen
    expect(isStep2GateSatisfied(logs, 14)).toBe(false);
  });

  it("belum lengkap bila ada kasus tanpa peringkat", () => {
    const logs = Array.from({ length: 14 }, (_, index) => log(index + 1, index + 1));
    logs[6] = log(7, null);
    expect(isStep2GateSatisfied(logs, 14)).toBe(false);
  });

  it("menolak peringkat ganda meski tercatat (pengaman terakhir)", () => {
    const logs = Array.from({ length: 14 }, (_, index) => log(index + 1, index + 1));
    logs[1] = log(2, 1); // duplikat dengan kasus 1; peringkat 2 hilang
    expect(isStep2GateSatisfied(logs, 14)).toBe(false);
  });

  it("menolak peringkat di luar rentang 1–14", () => {
    const logs = Array.from({ length: 14 }, (_, index) => log(index + 1, index + 1));
    logs[13] = log(14, 0);
    expect(isStep2GateSatisfied(logs, 14)).toBe(false);
  });
});

describe("countRankedCases — indikator progres", () => {
  it("menghitung kasus dengan peringkat terpasang", () => {
    const logs = [log(1, 1), log(2, null), log(4, 5)];
    expect(countRankedCases(logs, 14)).toBe(2);
  });

  it("batas kasus 1..caseCount dihormati", () => {
    const logs = Array.from({ length: 20 }, (_, index) => log(index + 1, index + 1));
    expect(countRankedCases(logs, 14)).toBe(14);
  });
});

describe("konstanta rentang peringkat", () => {
  it("peringkat valid 1–14 sesuai PRD", () => {
    expect(RANK_MIN).toBe(1);
    expect(RANK_MAX).toBe(14);
  });
});
