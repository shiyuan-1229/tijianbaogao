import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("@/shared/api/server-client", () => ({
  serverApiClient: {
    post: postMock,
  },
}));

import { POST } from "@/app/api/agent/confirm/route";

describe("agent confirm route", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("rejects malformed json", async () => {
    const request = new Request("http://localhost/api/agent/confirm", {
      body: "{",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain("Malformed JSON");
  });

  it("bridges valid confirmations to the backend reviews endpoint", async () => {
    postMock.mockResolvedValue({
      remark: "Ops confirmed the missing feed.",
      resolution: "approved",
      resume_from_checkpoint: true,
      task_id: "task-daily-004",
    });

    const request = new Request("http://localhost/api/agent/confirm", {
      body: JSON.stringify({
        remark: "Ops confirmed the missing feed.",
        resolution: "approved",
        task_id: "task-daily-004",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Agent-Confirm-Data-Source")).toBe("backend");
    expect(postMock).toHaveBeenCalledWith(
      "/api/reviews/resume",
      {
        remark: "Ops confirmed the missing feed.",
        resolution: "approved",
        task_id: "task-daily-004",
      },
      { cache: "no-store" },
    );
    expect(body).toMatchObject({
      backend_route: "/api/reviews/resume",
      data_source: "backend",
      resolution: "approved",
      resume_from_checkpoint: true,
      task_id: "task-daily-004",
    });
  });
});
