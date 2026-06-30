import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/tasks/[taskId]/events/route";

describe("task events route", () => {
  it("returns a mock-labeled event feed for the requested task", async () => {
    const response = await GET(
      new Request("http://localhost/api/tasks/task-daily-001/events"),
      {
        params: Promise.resolve({ taskId: "task-daily-001" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Task-Events-Data-Source")).toBe("mock");
    expect(body.data_source).toBe("mock");
    expect(body.backend_available).toBe(false);
    expect(body.task_id).toBe("task-daily-001");
    expect(body.events).toHaveLength(4);
    expect(body.events.map((event: { state: string }) => event.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("rejects blank task ids", async () => {
    const response = await GET(
      new Request("http://localhost/api/tasks/%20/events"),
      {
        params: Promise.resolve({ taskId: "   " }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain("Task id is required");
  });
});
