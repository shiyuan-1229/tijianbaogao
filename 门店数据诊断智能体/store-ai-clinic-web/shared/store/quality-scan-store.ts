import { create } from "zustand";

import type { QualityIssueData, QualityMetric, QualityPipelineStage } from "@/features/quality/lib/dataset-scanner";

type QualityIssue = QualityIssueData & {
  previewUrl?: string;
  previewType?: "image" | "pdf" | "file";
  previewImageUrl?: string;
  previewImageUrls?: string[];
  previewPageCount?: number;
  findingType?: string;
  bbox?: [number, number, number, number];
};

export type QualityScanAssetRecord = {
  group: string;
  archiveId: string;
  pdfFiles: string[];
  excelFiles: string[];
  visitCount: number;
  hasPdf: boolean;
  hasExcel: boolean;
  meetsThreeVisits: boolean;
  missingItems: string[];
};

export type QualityScanAssetSummary = {
  datasetPath: string;
  scannedAt: string;
  totalGroups: number;
  totalArchives: number;
  totalPdfFiles: number;
  totalExcelFiles: number;
  matchedArchives: number;
  missingPdfArchives: number;
  missingExcelArchives: number;
  underThreeVisitArchives: number;
  assets: QualityScanAssetRecord[];
};

type QualityScanState = {
  taskId: string | null;
  datasetPath: string | null;
  importSummary: {
    taskId: string;
    datasetPath: string;
    totalBytes: number;
    totalFiles: number;
    files: Array<{ name: string; size: number; type?: string }>;
  } | null;
  issues: QualityIssue[];
  pipeline: QualityPipelineStage[];
  metrics: QualityMetric[];
  assetSummary: QualityScanAssetSummary | null;
  scannedAt: string | null;
  isCleaning: boolean;
  setImportSummary: (summary: QualityScanState["importSummary"]) => void;
  setIssues: (issues: QualityIssue[]) => void;
  setPipeline: (pipeline: QualityPipelineStage[]) => void;
  setMetrics: (metrics: QualityMetric[]) => void;
  setAssetSummary: (assetSummary: QualityScanAssetSummary | null) => void;
  setScannedAt: (value: string | null) => void;
  setIsCleaning: (cleaning: boolean) => void;
  setScanResult: (result: {
    taskId: string;
    datasetPath: string;
    importSummary: NonNullable<QualityScanState["importSummary"]>;
    issues: QualityIssue[];
    metrics: QualityMetric[];
    pipeline: QualityPipelineStage[];
    assetSummary?: QualityScanAssetSummary | null;
    scannedAt?: string | null;
  }) => void;
  reset: () => void;
};

export const useQualityScanStore = create<QualityScanState>((set) => ({
  taskId: null,
  datasetPath: null,
  importSummary: null,
  issues: [],
  pipeline: [],
  metrics: [],
  assetSummary: null,
  scannedAt: null,
  isCleaning: false,
  setImportSummary: (importSummary) => set({ importSummary }),
  setIssues: (issues) => set({ issues }),
  setPipeline: (pipeline) => set({ pipeline }),
  setMetrics: (metrics) => set({ metrics }),
  setAssetSummary: (assetSummary) => set({ assetSummary }),
  setScannedAt: (scannedAt) => set({ scannedAt }),
  setIsCleaning: (isCleaning) => set({ isCleaning }),
  setScanResult: (result) =>
    set({
      taskId: result.taskId,
      datasetPath: result.datasetPath,
      importSummary: result.importSummary,
      issues: result.issues,
      pipeline: result.pipeline,
      metrics: result.metrics,
      assetSummary: result.assetSummary ?? null,
      scannedAt: result.scannedAt ?? new Date().toISOString(),
      isCleaning: false,
    }),
  reset: () =>
    set({
      taskId: null,
      datasetPath: null,
      importSummary: null,
      issues: [],
      pipeline: [],
      metrics: [],
      assetSummary: null,
      scannedAt: null,
      isCleaning: false,
    }),
}));
