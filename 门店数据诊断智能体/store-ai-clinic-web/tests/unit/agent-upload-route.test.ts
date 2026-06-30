import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/agent/upload/route";

describe("agent upload route", () => {
  it("rejects non-multipart requests", async () => {
    const request = new Request("http://localhost/api/agent/upload", {
      body: JSON.stringify({ files: [] }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.detail).toContain("multipart/form-data");
    expect(response.headers.get("X-Agent-Upload-Data-Source")).toBe("mock");
  });

  it("summarizes multipart files without persisting them", async () => {
    const formData = new FormData();
    formData.append(
      "reports",
      new File(["daily metrics"], "daily-report.csv", {
        lastModified: 1718000000000,
        type: "text/csv",
      }),
    );

    const request = {
      formData: async () => formData,
    } as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Agent-Upload-Data-Source")).toBe("mock");
    expect(body.data_source).toBe("mock");
    expect(body.persisted).toBe(false);
    expect(body.total_files).toBe(1);
    expect(body.total_bytes).toBeGreaterThan(0);
    expect(body.files).toEqual([
      {
        field_name: "reports",
        last_modified: 1718000000000,
        name: "daily-report.csv",
        size: 13,
        type: "text/csv",
      },
    ]);
  });
});
