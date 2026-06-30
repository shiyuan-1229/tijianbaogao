import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("quality import routes", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bridges multipart quality imports to the backend", async () => {
    postMock.mockResolvedValue({
      data_source: "backend",
      persisted: true,
      task_id: "quality-import-abc123",
      dataset_path: "data/quality/imports/quality-import-abc123",
      total_bytes: 13,
      total_files: 1,
      files: [
        {
          field_name: "files",
          name: "report.pdf",
          size: 13,
          type: "application/pdf",
          saved_path: "data/quality/imports/quality-import-abc123/report.pdf",
        },
      ],
      note: "Files were persisted for quality scanning.",
    });

    const formData = new FormData();
    formData.append("files", new File(["pdf content"], "report.pdf", { type: "application/pdf" }));

    const { POST } = await import("@/app/api/quality/import/route");
    const response = await POST({ formData: async () => formData } as Request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("X-Quality-Import-Data-Source")).toBe("backend");
    expect(postMock).toHaveBeenCalledWith(
      "/api/quality/import",
      formData,
      expect.objectContaining({ cache: "no-store", timeoutMs: 30000 }),
    );
    expect(body.persisted).toBe(true);
    expect(body.task_id).toBe("quality-import-abc123");
  });

  it("proxies imported quality files from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("image", {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": "5",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/quality/import/[taskId]/files/[fileName]/route");
    const response = await GET({} as Request, {
      params: Promise.resolve({ taskId: "quality-import-image123", fileName: "report page.png" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/quality/imports/quality-import-image123/files/report%20page.png",
      { cache: "no-store" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("image");
  });

  it("proxies rendered pdf page previews from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("pdf-page", {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": "8",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/quality/pdf-pages/[fileName]/route");
    const response = await GET({} as Request, {
      params: Promise.resolve({ fileName: "rendered page.png" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/quality/pdf-pages/rendered%20page.png",
      { cache: "no-store" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("pdf-page");
  });

  it("proxies extracted quality rules from the backend", async () => {
    getMock.mockResolvedValue({
      dataset_path: "D:/桌面/数据/5人",
      source_document: "D:/桌面/数据/体检报告需求.docx",
      rules: [
        {
          rule_id: "R-REQ-008",
          rule_name: "体检总结完整性",
          source: "D:/桌面/数据/体检报告需求.docx",
          dimension: "总结完整性",
          check_target: "PDF 报告",
          pass_condition: "报告包含体检总结。",
          fail_condition: "缺少总结。",
          severity: "high",
          detect_method: "PDF 页面视觉识别 + OCR/人工复核",
          need_human_review: true,
        },
      ],
    });

    const { GET } = await import("@/app/api/quality/rules/route");
    const response = await GET(new Request("http://localhost/api/quality/rules?datasetPath=D%3A%2F%E6%A1%8C%E9%9D%A2%2F%E6%95%B0%E6%8D%AE%2F5%E4%BA%BA"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Quality-Rules-Data-Source")).toBe("backend");
    expect(getMock).toHaveBeenCalledWith(
      "/api/quality/rules?dataset_path=D%3A%2F%E6%A1%8C%E9%9D%A2%2F%E6%95%B0%E6%8D%AE%2F5%E4%BA%BA",
      expect.objectContaining({ cache: "no-store", timeoutMs: 30000 }),
    );
    expect(body.rules[0].rule_id).toBe("R-REQ-008");
  });
  it("starts a backend quality scan for an imported task", async () => {
    postMock.mockResolvedValue({
      task_id: "quality-import-abc123",
      dataset_path: "data/quality/imports/quality-import-abc123",
      status: "done",
      message: "Quality scan completed.",
      scan: {
        dataset_path: "data/quality/imports/quality-import-abc123",
        scanned_at: "2026-06-27T12:00:00+08:00",
        metrics: [],
        pipeline: [],
        issues: [],
      },
    });

    const { POST } = await import("@/app/api/quality/import/[taskId]/scan/route");
    const response = await POST({} as Request, { params: Promise.resolve({ taskId: "quality-import-abc123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Quality-Scan-Data-Source")).toBe("backend");
    expect(postMock).toHaveBeenCalledWith(
      "/api/quality/imports/quality-import-abc123/scan",
      undefined,
      expect.objectContaining({ cache: "no-store", timeoutMs: 180000 }),
    );
    expect(body.status).toBe("done");
  });
});








