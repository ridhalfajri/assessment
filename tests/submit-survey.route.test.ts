import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { POST } from "@/app/api/submit-survey/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { buildValidPayload } from "./helpers/payload";

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

const rpcMock = vi.fn();

function postRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/submit-survey", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  (getSupabaseAdminClient as Mock).mockReturnValue({ rpc: rpcMock });
  resetRateLimitsForTests();
});

describe("POST /api/submit-survey", () => {
  it("payload valid → 200 dengan status created; RPC dipanggil sekali dengan payload tervalidasi", async () => {
    rpcMock.mockResolvedValue({
      data: {
        status: "created",
        sessionId: "8e9b4f32-6c1e-4a7d-9a2b-1f0c3d4e5f60",
        participantId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      },
      error: null,
    });

    const res = await POST(postRequest(JSON.stringify(buildValidPayload())));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("created");

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpcMock.mock.calls[0];
    expect(fnName).toBe("submit_survey");
    expect(args.p_payload.sessionData.participantId).toBe(
      "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    );
    expect(args.p_payload.caseLogs).toHaveLength(14);
    // Field manipulationCheck (BETE-14) ikut diteruskan ke RPC — bukan di-strip.
    expect(args.p_payload.questionnaire.manipulationCheck).toBe(4);
  });

  it("payload valid (trim otomatis) diteruskan bersih ke RPC", async () => {
    rpcMock.mockResolvedValue({ data: { status: "created" }, error: null });

    const payload = buildValidPayload();
    payload.demographics.username = "  budi  ";
    payload.demographics.phoneNumber = "0812 3456-7890";
    await POST(postRequest(JSON.stringify(payload)));

    const [, args] = rpcMock.mock.calls[0];
    expect(args.p_payload.demographics.username).toBe("budi");
    expect(args.p_payload.demographics.phoneNumber).toBe("081234567890");
  });

  it("submit ulang (idempoten) → tetap 200 dengan status already_submitted", async () => {
    rpcMock.mockResolvedValue({
      data: {
        status: "already_submitted",
        sessionId: "8e9b4f32-6c1e-4a7d-9a2b-1f0c3d4e5f60",
        participantId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
      },
      error: null,
    });

    const res = await POST(postRequest(JSON.stringify(buildValidPayload())));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("already_submitted");
  });

  it("body melebihi 128 KB → 413 tanpa menyentuh RPC (BETE-13)", async () => {
    const oversized = JSON.stringify({ filler: "x".repeat(200_000) });

    const res = await POST(postRequest(oversized));

    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain("batas");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("request ke-31 dari IP yang sama dalam jendela → 429 dengan Retry-After (BETE-13)", async () => {
    // 30 request pertama lolos rate limit (body invalid JSON → 400, tetap
    // dihitung — spam protection), request ke-31 ditolak.
    const headers = { "x-forwarded-for": "10.0.0.1" };
    for (let i = 0; i < 30; i += 1) {
      const res = await POST(postRequest("bukan-json", headers));
      expect(res.status).toBe(400);
    }

    const blocked = await POST(
      postRequest(JSON.stringify(buildValidPayload()), headers),
    );

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("IP berbeda tidak terpengaruh limit IP lain (BETE-13)", async () => {
    for (let i = 0; i < 30; i += 1) {
      await POST(postRequest("bukan-json", { "x-forwarded-for": "10.0.0.1" }));
    }

    const res = await POST(postRequest("bukan-json", { "x-forwarded-for": "10.0.0.2" }));

    expect(res.status).toBe(400);
  });

  it("body bukan JSON → 400, RPC tidak dipanggil", async () => {
    const res = await POST(postRequest("bukan json{{{"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JSON/i);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("payload tampered (treatmentGroupId 7, rank duplikat) → 400 dengan details jelas, RPC tidak dipanggil", async () => {
    const payload = buildValidPayload();
    payload.sessionData.treatmentGroupId = 7;
    payload.caseLogs[1].rank = payload.caseLogs[0].rank;

    const res = await POST(postRequest(JSON.stringify(payload)));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/validasi/i);
    expect(Array.isArray(body.details)).toBe(true);
    const paths = body.details.map((d: { path: string }) => d.path);
    expect(paths).toContain("sessionData.treatmentGroupId");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("payload tanpa manipulationCheck → 400, RPC tidak dipanggil (BETE-14)", async () => {
    const payload = buildValidPayload();
    delete (payload.questionnaire as Record<string, unknown>).manipulationCheck;

    const res = await POST(postRequest(JSON.stringify(payload)));

    expect(res.status).toBe(400);
    const body = await res.json();
    const paths = body.details.map((d: { path: string }) => d.path);
    expect(paths).toContain("questionnaire.manipulationCheck");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("payload dengan tipe yang salah → 400 tanpa menyentuh database", async () => {
    const res = await POST(postRequest(JSON.stringify({ sessionData: "hack" })));

    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("kegagalan database → 500 dengan pesan umum (tanpa detail internal)", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "connection refused to db-host-internal:5432" },
    });

    const res = await POST(postRequest(JSON.stringify(buildValidPayload())));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/kesalahan internal/i);
    expect(JSON.stringify(body)).not.toContain("db-host-internal");
  });

  it("exception dari client Supabase → 500 dengan pesan umum", async () => {
    rpcMock.mockRejectedValue(new Error("fetch failed"));

    const res = await POST(postRequest(JSON.stringify(buildValidPayload())));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/kesalahan internal/i);
  });
});
