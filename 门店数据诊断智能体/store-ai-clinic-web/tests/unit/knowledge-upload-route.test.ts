import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("@/shared/api/server-client", () => ({
  serverApiClient: {
    post: postMock,
  },
}));

describe("knowledge upload route", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("bridges multipart knowledge uploads to the backend knowledge service", async () => {
    postMock.mockResolvedValue({
      source_id: "src_upload",
      source_title: "门店客诉处理规范",
      knowledge_type: "sop",
      status: "pending_publish",
      version_label: "V1",
      updated_at: "2026-06-14T13:00:00Z",
      chunk_count: 2,
    });

    const formData = new FormData();
    formData.append("source_title", "门店客诉处理规范");
    formData.append("knowledge_type", "sop");
    formData.append("version_label", "V1");
    formData.append(
      "file",
      new File(["第一条：30分钟内首响"], "complaint-sop.txt", {
        type: "text/plain",
      }),
    );

    const { POST } = await import("@/app/api/knowledge/sources/upload/route");
    const response = await POST({
      formData: async () => formData,
    } as unknown as Request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Knowledge-Data-Source")).toBe("backend");
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][0]).toBe("/api/knowledge/sources/upload");
    expect(postMock.mock.calls[0][1]).toBe(formData);
    expect(body.chunk_count).toBe(2);
  });
});
