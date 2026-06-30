import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QualityDatasetScan } from "@/features/quality/lib/dataset-scanner";

const scanQualityDatasetMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quality/lib/dataset-scanner", () => ({
  scanQualityDataset: scanQualityDatasetMock,
}));

const dataset: QualityDatasetScan = {
  datasetPath: "D:\\桌面\\数据\\5人",
  scannedAt: "2026-06-26T08:00:00.000Z",
  metrics: [],
  pipeline: [],
  issues: [],
};

const globalCacheKey = "__STORE_AI_CLINIC_QUALITY_DATASET_CACHE__";

describe("default quality dataset loader", () => {
  beforeEach(() => {
    vi.resetModules();
    scanQualityDatasetMock.mockReset();
    delete process.env.QUALITY_DATASET_PATH;
    delete (globalThis as Record<string, unknown>)[globalCacheKey];
  });

  it("reuses the same dataset scan for repeated route renders", async () => {
    scanQualityDatasetMock.mockResolvedValue(dataset);
    const { loadDefaultQualityDataset } = await import("@/features/quality/lib/default-dataset");

    const [first, second] = await Promise.all([
      loadDefaultQualityDataset(),
      loadDefaultQualityDataset(),
    ]);

    expect(first).toBe(dataset);
    expect(second).toBe(dataset);
    expect(scanQualityDatasetMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the dataset scan cache across module reloads", async () => {
    scanQualityDatasetMock.mockResolvedValue(dataset);
    const firstModule = await import("@/features/quality/lib/default-dataset");

    const first = await firstModule.loadDefaultQualityDataset();
    vi.resetModules();
    const secondModule = await import("@/features/quality/lib/default-dataset");
    const second = await secondModule.loadDefaultQualityDataset();

    expect(first).toBe(dataset);
    expect(second).toBe(dataset);
    expect(scanQualityDatasetMock).toHaveBeenCalledTimes(1);
  });
});