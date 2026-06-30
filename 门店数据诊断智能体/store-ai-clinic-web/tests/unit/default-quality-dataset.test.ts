import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, scanMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  scanMock: vi.fn(),
}));

vi.mock("@/shared/api/server-client", () => ({
  serverApiClient: {
    get: getMock,
  },
}));

vi.mock("@/features/quality/lib/dataset-scanner", () => ({
  scanQualityDataset: scanMock,
}));

function clearDatasetCache() {
  delete (globalThis as typeof globalThis & { __STORE_AI_CLINIC_QUALITY_DATASET_CACHE__?: unknown }).__STORE_AI_CLINIC_QUALITY_DATASET_CACHE__;
}

describe("default quality dataset loading", () => {
  beforeEach(() => {
    vi.resetModules();
    getMock.mockReset();
    scanMock.mockReset();
    clearDatasetCache();
  });

  it("uses the lightweight local scan for route renders without starting a backend vision scan", async () => {
    scanMock.mockResolvedValue({
      datasetPath: "D:/桌面/数据/5人",
      scannedAt: "2026-06-29T00:00:00.000Z",
      metrics: [{ label: "问题", value: "1", icon: "warning", color: "orange" }],
      pipeline: [{ label: "文件扫描", value: "1/1", done: true, active: false }],
      issues: [
        {
          id: "ocr-placeholder-1",
          index: 1,
          fileName: "02250201.pdf",
          group: "35-44",
          archiveId: "02250201",
          page: "1",
          issueType: "OCR 待处理",
          category: "content",
          severity: "medium",
          ruleId: "R-OCR-001",
          evidence: "默认页面只加载已有轻量证据，不触发视觉 AI 重扫。",
          aiJudgement: "需补充 OCR 证据",
          recommendation: "点击开始数据清洗后再触发真实扫描。",
          confidence: 0.7,
          status: "needs_review",
          foundAt: "2026-06-29 12:00:00",
        },
      ],
    });

    const { loadDefaultQualityDataset } = await import("@/features/quality/lib/default-dataset");
    const dataset = await loadDefaultQualityDataset();

    expect(getMock).not.toHaveBeenCalled();
    expect(scanMock).toHaveBeenCalledWith("D:\\桌面\\数据\\5人");
    expect(dataset?.datasetPath).toBe("D:/桌面/数据/5人");
    expect(dataset?.scannedAt).toBe("2026-06-29T00:00:00.000Z");
    expect(dataset?.issues[0]).toMatchObject({
      fileName: "02250201.pdf",
      ruleId: "R-OCR-001",
      aiJudgement: "需补充 OCR 证据",
    });
  });
});
