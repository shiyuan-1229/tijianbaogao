import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QualityIssueData, VisionFindingEvidence, VisionReviewProvider } from "@/features/quality/lib/dataset-scanner";

type SidecarVisionFinding = Partial<VisionFindingEvidence> & {
  page?: number | string;
  confidence?: number | string;
};

const categories = new Set<QualityIssueData["category"]>(["privacy", "content", "format", "history"]);
const severities = new Set<QualityIssueData["severity"]>(["high", "medium", "low"]);

export function createSidecarVisionProvider(): VisionReviewProvider {
  return {
    async reviewPdf(filePath) {
      const sidecarPath = await findSidecarPath(filePath);
      if (!sidecarPath) return [];

      const content = await readFile(sidecarPath, "utf8");
      return jsonSidecarToFindings(content);
    },
  };
}

async function findSidecarPath(filePath: string) {
  const parsed = path.parse(filePath);
  const candidates = [path.join(parsed.dir, parsed.name + ".vision.json"), filePath + ".vision.json"];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return undefined;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function jsonSidecarToFindings(content: string): VisionFindingEvidence[] {
  const parsed = JSON.parse(content) as { findings?: SidecarVisionFinding[]; issues?: SidecarVisionFinding[] } | SidecarVisionFinding[];
  const findings = Array.isArray(parsed) ? parsed : parsed.findings ?? parsed.issues ?? [];
  return findings.map(normalizeFinding).filter((finding) => finding.evidence.trim());
}

function normalizeFinding(finding: SidecarVisionFinding): VisionFindingEvidence {
  const category = categories.has(finding.category as QualityIssueData["category"]) ? finding.category as QualityIssueData["category"] : "content";
  const severity = severities.has(finding.severity as QualityIssueData["severity"]) ? finding.severity as QualityIssueData["severity"] : "medium";
  const ruleId = stringOrDefault(finding.ruleId, "R-VISION-001");
  const issueType = stringOrDefault(finding.issueType, "\u89c6\u89c9\u6a21\u578b\u7591\u70b9");
  const evidence = stringOrDefault(finding.evidence, "");

  return {
    ruleId,
    issueType,
    category,
    severity,
    page: String(Math.max(1, Math.trunc(numericOrDefault(finding.page, 1) ?? 1))),
    evidence,
    aiJudgement: stringOrDefault(finding.aiJudgement, "\u89c6\u89c9\u6a21\u578b\u8f93\u51fa\u9700\u4eba\u5de5\u590d\u6838\u7684\u8bc1\u636e"),
    recommendation: stringOrDefault(finding.recommendation, "\u6838\u5bf9 PDF \u539f\u56fe\u3001OCR \u7ed3\u679c\u548c\u89c6\u89c9\u6a21\u578b\u8bc1\u636e\u540e\u5904\u7406\u3002"),
    confidence: numericOrDefault(finding.confidence, 0.75) ?? 0.75,
  };
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numericOrDefault(value: number | string | undefined, fallback: number | undefined) {
  if (value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
