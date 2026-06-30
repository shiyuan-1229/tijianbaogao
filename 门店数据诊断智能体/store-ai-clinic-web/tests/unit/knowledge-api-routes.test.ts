import { beforeEach, describe, expect, it, vi } from "vitest";

const ROUTE_TIMEOUT_MS = 8000;

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/shared/api/server-client", () => ({
  serverApiClient: {
    get: getMock,
    post: postMock,
  },
}));

describe("knowledge routes", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("loads knowledge sources from the backend knowledge service", async () => {
    getMock.mockResolvedValue([
      {
        source_id: "src_001",
        source_title: "运营手册V3",
        knowledge_type: "sop",
        status: "published",
        version_label: "V3",
        updated_at: "2026-06-14T10:00:00Z",
        chunk_count: 12,
      },
    ]);

    const { GET } = await import("@/app/api/knowledge/sources/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Knowledge-Data-Source")).toBe("backend");
    expect(getMock).toHaveBeenCalledWith("/api/knowledge/sources", {
      cache: "no-store",
      timeoutMs: ROUTE_TIMEOUT_MS,
    });
    expect(body[0].source_title).toBe("运营手册V3");
  });

  it("creates knowledge sources through the backend knowledge service", async () => {
    postMock.mockResolvedValue({
      source_id: "src_002",
      source_title: "门店客诉处理规范",
      knowledge_type: "sop",
      status: "pending_publish",
      version_label: "V1",
      updated_at: "2026-06-14T11:00:00Z",
      chunk_count: 0,
    });

    const { POST } = await import("@/app/api/knowledge/sources/route");
    const response = await POST(
      new Request("http://localhost/api/knowledge/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_title: "门店客诉处理规范",
          knowledge_type: "sop",
          version_label: "V1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(postMock).toHaveBeenCalledWith(
      "/api/knowledge/sources",
      {
        source_title: "门店客诉处理规范",
        knowledge_type: "sop",
        version_label: "V1",
      },
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.status).toBe("pending_publish");
  });

  it("publishes knowledge sources through the backend knowledge service", async () => {
    postMock.mockResolvedValue({
      source_id: "src_002",
      source_title: "门店客诉处理规范",
      knowledge_type: "sop",
      status: "published",
      version_label: "V1",
      updated_at: "2026-06-14T11:00:00Z",
      chunk_count: 0,
    });

    const { POST } = await import("@/app/api/knowledge/sources/[sourceId]/publish/route");
    const response = await POST(
      new Request("http://localhost/api/knowledge/sources/src_002/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ sourceId: "src_002" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith(
      "/api/knowledge/sources/src_002/publish",
      undefined,
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.status).toBe("published");
  });
});
