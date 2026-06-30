import type { QualityAssetSummary } from "@/features/quality/components/quality-shell";
import { serverApiClient } from "@/shared/api/server-client";

const DEFAULT_QUALITY_DATASET_PATH = "D:\\桌面\\数据\\5人";
const QUALITY_ASSETS_TIMEOUT_MS = 30000;

type BackendQualityArchiveAsset = {
  group: string;
  archive_id: string;
  pdf_files: string[];
  excel_files: string[];
  visit_count: number;
  has_pdf: boolean;
  has_excel: boolean;
  meets_three_visits: boolean;
  missing_items: string[];
};

type BackendQualityAssetSummary = {
  dataset_path: string;
  scanned_at: string;
  total_groups: number;
  total_archives: number;
  total_pdf_files: number;
  total_excel_files: number;
  matched_archives: number;
  missing_pdf_archives: number;
  missing_excel_archives: number;
  under_three_visit_archives: number;
  assets: BackendQualityArchiveAsset[];
};

export async function loadDefaultQualityAssets(): Promise<QualityAssetSummary | undefined> {
  const datasetPath = process.env.QUALITY_DATASET_PATH ?? DEFAULT_QUALITY_DATASET_PATH;

  try {
    const response = await serverApiClient.get<BackendQualityAssetSummary>(
      `/api/quality/assets?dataset_path=${encodeURIComponent(datasetPath)}`,
      { cache: "no-store", timeoutMs: QUALITY_ASSETS_TIMEOUT_MS },
    );
    return {
      datasetPath: response.dataset_path,
      scannedAt: response.scanned_at,
      totalGroups: response.total_groups,
      totalArchives: response.total_archives,
      totalPdfFiles: response.total_pdf_files,
      totalExcelFiles: response.total_excel_files,
      matchedArchives: response.matched_archives,
      missingPdfArchives: response.missing_pdf_archives,
      missingExcelArchives: response.missing_excel_archives,
      underThreeVisitArchives: response.under_three_visit_archives,
      assets: response.assets.map((asset) => ({
        group: asset.group,
        archiveId: asset.archive_id,
        pdfFiles: asset.pdf_files,
        excelFiles: asset.excel_files,
        visitCount: asset.visit_count,
        hasPdf: asset.has_pdf,
        hasExcel: asset.has_excel,
        meetsThreeVisits: asset.meets_three_visits,
        missingItems: asset.missing_items,
      })),
    };
  } catch {
    return undefined;
  }
}
