import type { QualityRuleSet } from "@/features/quality/components/quality-shell";
import { serverApiClient } from "@/shared/api/server-client";

const DEFAULT_QUALITY_DATASET_PATH = "D:\\桌面\\数据\\5人";
const QUALITY_RULES_TIMEOUT_MS = 30000;

type BackendQualityRule = {
  rule_id: string;
  rule_name: string;
  source: string;
  dimension: string;
  check_target: string;
  pass_condition: string;
  fail_condition: string;
  severity: "high" | "medium" | "low";
  detect_method: string;
  need_human_review: boolean;
};

type BackendQualityRulesResponse = {
  dataset_path: string;
  source_document?: string | null;
  rules: BackendQualityRule[];
};

export async function loadDefaultQualityRules(): Promise<QualityRuleSet | undefined> {
  const datasetPath = process.env.QUALITY_DATASET_PATH ?? DEFAULT_QUALITY_DATASET_PATH;

  try {
    const response = await serverApiClient.get<BackendQualityRulesResponse>(
      `/api/quality/rules?dataset_path=${encodeURIComponent(datasetPath)}`,
      { cache: "no-store", timeoutMs: QUALITY_RULES_TIMEOUT_MS },
    );
    return normalizeQualityRules(response);
  } catch {
    return undefined;
  }
}

function normalizeQualityRules(response: BackendQualityRulesResponse): QualityRuleSet {
  return {
    datasetPath: response.dataset_path,
    sourceDocument: response.source_document,
    rules: response.rules.map((rule) => ({
      ruleId: rule.rule_id,
      ruleName: rule.rule_name,
      source: rule.source,
      dimension: rule.dimension,
      checkTarget: rule.check_target,
      passCondition: rule.pass_condition,
      failCondition: rule.fail_condition,
      severity: rule.severity,
      detectMethod: rule.detect_method,
      needHumanReview: rule.need_human_review,
    })),
  };
}
