import type { QualityExportSummary } from "@/features/quality/components/quality-shell";
import { serverApiClient } from "@/shared/api/server-client";

const DEFAULT_QUALITY_DATASET_PATH = "D:\\桌面\\数据\\5人";
const QUALITY_EXPORTS_TIMEOUT_MS = 30000;

type BackendQualityExportSection = {
  key: string;
  title: string;
  item_count: number;
  description: string;
};

type BackendQualityExportRuleHit = {
  rule_id: string;
  rule_name?: string | null;
  hit_count: number;
};

type BackendQualityExportSummary = {
  dataset_path: string;
  generated_at: string;
  total_issues: number;
  confirmed_issues: number;
  rejected_issues: number;
  pending_issues: number;
  review_record_count: number;
  evidence_image_count: number;
  sections: BackendQualityExportSection[];
  rule_hits: BackendQualityExportRuleHit[];
};

export async function loadDefaultQualityExports(): Promise<QualityExportSummary | undefined> {
  const datasetPath = process.env.QUALITY_DATASET_PATH ?? DEFAULT_QUALITY_DATASET_PATH;

  try {
    const response = await serverApiClient.get<BackendQualityExportSummary>(
      `/api/quality/exports/summary?dataset_path=${encodeURIComponent(datasetPath)}`,
      { cache: "no-store", timeoutMs: QUALITY_EXPORTS_TIMEOUT_MS },
    );
    return {
      datasetPath: response.dataset_path,
      generatedAt: response.generated_at,
      totalIssues: response.total_issues,
      confirmedIssues: response.confirmed_issues,
      rejectedIssues: response.rejected_issues,
      pendingIssues: response.pending_issues,
      reviewRecordCount: response.review_record_count,
      evidenceImageCount: response.evidence_image_count,
      sections: response.sections.map((section) => ({
        key: section.key,
        title: section.title,
        itemCount: section.item_count,
        description: section.description,
      })),
      ruleHits: response.rule_hits.map((ruleHit) => ({
        ruleId: ruleHit.rule_id,
        ruleName: ruleHit.rule_name,
        hitCount: ruleHit.hit_count,
      })),
    };
  } catch {
    return undefined;
  }
}
