import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { POST } from "@/app/api/submit-survey/route";
import { buildValidPayload } from "./helpers/payload";

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

const rpcMock = vi.fn();

function postRequest(body: string): Request {
  return new Request("http://localhost:3000/api/submit-survey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  (getSupabaseAdminClient as Mock).mockReturnValue({ rpc: rpcMock });
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
