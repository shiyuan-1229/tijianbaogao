"use client";

import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Pause,
  RefreshCw,
  Search,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import type { QualityDatasetScan, QualityIssueData, QualityMetric } from "@/features/quality/lib/dataset-scanner";

export type QualityWorkspaceView = "batch" | "issues" | "detail" | "review" | "rules" | "export";
type IssueListVariant = "default" | "screenshot";
type ReportDetailVariant = "default" | "screenshot";
type ReviewVariant = "default" | "screenshot";
type RulesVariant = "default" | "screenshot";
type ExportVariant = "default" | "screenshot";

type IssueCategory = "all" | "privacy" | "content" | "format" | "history";
type IssueSeverity = "high" | "medium" | "low";
type ReviewStatus = "needs_review" | "ai_reviewing" | "disputed" | "confirmed" | "rejected";
type ReviewDecision = "confirmed" | "rejected" | "disputed";
type SeverityFilter = "all" | IssueSeverity;
type StatusFilter = "all" | ReviewStatus;
type EvidenceBox = [number, number, number, number];
type FindingType = "data_error" | "missing_text" | "privacy_leak" | "history_gap" | "format" | "other";
type FilterMenuKey = "issue" | "severity" | "status" | null;

type QualityIssue = QualityIssueData & {
  previewUrl?: string;
  previewType?: "image" | "pdf" | "file";
  previewImageUrl?: string;
  previewImageUrls?: string[];
  previewPageCount?: number;
  findingType?: FindingType;
  bbox?: EvidenceBox;
};

export type QualityRuleData = {
  ruleId: string;
  ruleName: string;
  source: string;
  dimension: string;
  checkTarget: string;
  passCondition: string;
  failCondition: string;
  severity: IssueSeverity;
  detectMethod: string;
  needHumanReview: boolean;
};

export type QualityAssetRecord = {
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

export type QualityAssetSummary = {
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
  assets: QualityAssetRecord[];
};

export type QualityRuleSet = {
  datasetPath: string;
  sourceDocument?: string | null;
  rules: QualityRuleData[];
};

export type QualityExportSection = {
  key: string;
  title: string;
  itemCount: number;
  description: string;
};

export type QualityExportRuleHit = {
  ruleId: string;
  ruleName?: string | null;
  hitCount: number;
};

export type QualityExportSummary = {
  datasetPath: string;
  generatedAt: string;
  totalIssues: number;
  confirmedIssues: number;
  rejectedIssues: number;
  pendingIssues: number;
  reviewRecordCount: number;
  evidenceImageCount: number;
  sections: QualityExportSection[];
  ruleHits: QualityExportRuleHit[];
};

type QualityExportTaskResponse = {
  id: string;
  export_type: string;
  dataset_path: string;
  status: "queued" | "running" | "done" | "failed";
  message: string;
  created_at: string;
  bundle_name?: string | null;
  bundle_path?: string | null;
  download_url?: string | null;
  artifact_count?: number | null;
};

type ImportedQualityFile = {
  name: string;
  size: number;
  type?: string;
  saved_path?: string;
};

type QualityImportResponse = {
  task_id: string;
  dataset_path: string;
  total_bytes: number;
  total_files: number;
  files: ImportedQualityFile[];
};

type BackendQualityIssue = {
  id: string;
  index: number;
  file_name: string;
  group?: string;
  archive_id?: string;
  page: string;
  issue_type: string;
  category: "privacy" | "content" | "format" | "history";
  severity: IssueSeverity;
  rule_id: string;
  evidence: string;
  ai_judgement: string;
  recommendation: string;
  confidence: number;
  status: ReviewStatus;
  found_at: string;
  preview_url?: string;
  preview_type?: "image" | "pdf" | "file";
  preview_image_url?: string;
  preview_image_urls?: string[];
  preview_page_count?: number;
  finding_type?: FindingType;
  bbox?: EvidenceBox;
};

type QualityScanResponse = {
  task_id: string;
  dataset_path: string;
  status: string;
  message: string;
  scan?: {
    dataset_path?: string;
    scanned_at?: string;
    metrics?: QualityMetric[];
    issues?: BackendQualityIssue[];
  };
};

const ISSUE_PAGE_SIZE = 20;

const viewMeta: Record<QualityWorkspaceView, { title: string; subtitle: string; issueTitle: string }> = {
  batch: { title: "批量检测工作台", subtitle: "只筛查、圈出问题、保留证据，不自动改动 PDF。", issueTitle: "高优先级问题" },
  issues: { title: "问题清单", subtitle: "集中查看疑似不合规和需要人工复核的问题。", issueTitle: "问题列表" },
  detail: { title: "单报告详情", subtitle: "查看报告证据、AI 判断、规则依据和人工复核动作。", issueTitle: "报告问题明细" },
  review: { title: "人工复核", subtitle: "对 AI 判断进行确认、驳回或标记争议。", issueTitle: "报告问题明细" },
  rules: { title: "规则库", subtitle: "维护可执行的报告质检规则。", issueTitle: "规则列表" },
  export: { title: "报告导出", subtitle: "导出问题清单、可能合规清单和人工复核记录。", issueTitle: "导出摘要" },
};

const fallbackMetrics: QualityMetric[] = [
  { label: "年龄段", value: "5", icon: "people", color: "teal" },
  { label: "PDF", value: "28", icon: "pdf", color: "blue" },
  { label: "Excel", value: "5", icon: "excel", color: "green" },
  { label: "问题", value: "37", icon: "warning", color: "orange" },
  { label: "待复核", value: "12", icon: "review", color: "red" },
];

const fallbackIssues: QualityIssue[] = [
  {
    id: "issue-missing-text",
    index: 1,
    fileName: "张三_体检报告.pdf",
    group: "35-44",
    archiveId: "02250201",
    page: "3",
    issueType: "疑似缺字",
    category: "content",
    severity: "high",
    ruleId: "R-OCR-001",
    evidence: "谷丙转氨酶疑似缺字，需要人工复核页面原图。",
    aiJudgement: "需要补充 OCR 证据",
    recommendation: "定位表格结果栏，核对原 PDF 与结构化字段。",
    confidence: 0.94,
    status: "needs_review",
    foundAt: "2025-05-22 14:32:11",
    findingType: "missing_text",
    bbox: [24, 36, 34, 8],
  },
  {
    id: "issue-page-boundary",
    index: 2,
    fileName: "李四_体检报告.pdf",
    group: "35-44",
    archiveId: "02496166",
    page: "1",
    issueType: "页数边界",
    category: "format",
    severity: "high",
    ruleId: "R-FORMAT-002",
    evidence: "页眉与上一页内容重叠，疑似分页边界异常。",
    aiJudgement: "格式质量异常",
    recommendation: "保留页数证据，进入人工复核确认是否缺页或断页。",
    confidence: 0.91,
    status: "needs_review",
    foundAt: "2025-05-22 14:31:07",
    findingType: "format",
  },
  {
    id: "issue-privacy",
    index: 3,
    fileName: "王五_体检报告.pdf",
    group: "35-44",
    archiveId: "03881215",
    page: "2",
    issueType: "疑似未脱敏",
    category: "privacy",
    severity: "high",
    ruleId: "R-PRIVACY-003",
    evidence: "身份证号未脱敏展示，截图与边界框已保留。",
    aiJudgement: "页面存在敏感信息未脱敏风险",
    recommendation: "人工核对原始页面后，进入脱敏问题清单。",
    confidence: 0.96,
    status: "needs_review",
    foundAt: "2025-05-22 14:30:45",
    findingType: "privacy_leak",
    bbox: [68, 20, 24, 5],
  },
  {
    id: "issue-history",
    index: 4,
    fileName: "赵六_体检报告.pdf",
    group: "45-59",
    archiveId: "05670128",
    page: "5",
    issueType: "历史对比",
    category: "history",
    severity: "medium",
    ruleId: "R-HISTORY-004",
    evidence: "血糖较上次升高 2.8 mmol/L，需要复核历史对比证据。",
    aiJudgement: "历史前后差异需要复核",
    recommendation: "调出历史报告，对比关键指标变化。",
    confidence: 0.88,
    status: "needs_review",
    foundAt: "2025-05-22 14:29:58",
    findingType: "history_gap",
  },
];

const prototypeRules: QualityRuleData[] = [
  {
    ruleId: "R-FILE-001",
    ruleName: "文件完整性检查",
    source: "agent.md 第一阶段边界",
    dimension: "文件盘点",
    checkTarget: "PDF + 结构化数据",
    passCondition: "PDF 与 Excel 对应完整，档案访问次数达标。",
    failCondition: "缺 PDF、缺 Excel 或访问记录不足。",
    severity: "high",
    detectMethod: "PDF + 结构化数据",
    needHumanReview: true,
  },
  {
    ruleId: "R-PRIVACY-003",
    ruleName: "敏感身份信息脱敏",
    source: "历史评估结论",
    dimension: "脱敏风险",
    checkTarget: "PDF 页面",
    passCondition: "不出现完整敏感信息。",
    failCondition: "身份证号、手机号、姓名等完整展示。",
    severity: "high",
    detectMethod: "PDF 转图 + OCR/视觉框选",
    needHumanReview: true,
  },
];

const fallbackExportSummary: QualityExportSummary = {
  datasetPath: "D:/桌面/数据/5人",
  generatedAt: "2026-06-26T12:00:00.000Z",
  totalIssues: 37,
  confirmedIssues: 9,
  rejectedIssues: 13,
  pendingIssues: 12,
  reviewRecordCount: 24,
  evidenceImageCount: 31,
  sections: [
    { key: "third-batch-report", title: "第三批数据检测报告", itemCount: 12, description: "覆盖 5 个年龄段、22 份档案和 37 个问题。" },
    { key: "non-compliant", title: "不合规问题清单", itemCount: 9, description: "人工已确认的问题，适合进入不合规清单。" },
    { key: "possible-compliant", title: "可能合规清单", itemCount: 13, description: "人工已驳回的问题，保留为可能合规样本。" },
    { key: "review-records", title: "人工复核记录", itemCount: 24, description: "确认、驳回、争议和备注记录。" },
  ],
  ruleHits: [
    { ruleId: "R-FORMAT-002", ruleName: "PDF 页数边界检查", hitCount: 7 },
    { ruleId: "R-OCR-001", ruleName: "OCR 证据完整性", hitCount: 5 },
  ],
};

const exportDeliverables = ["第三批数据检测报告", "不合规问题清单", "可能合规清单", "人工复核记录", "证据截图索引"];

const exportDeliverableSectionKeys: Record<string, string[]> = {
  "第三批数据检测报告": ["third-batch-report"],
  "不合规问题清单": ["non-compliant"],
  "可能合规清单": ["possible-compliant"],
  "人工复核记录": ["review-records"],
  "证据截图索引": ["evidence-image-index"],
};

const issueFilters: Array<{ value: IssueCategory; label: string }> = [
  { value: "all", label: "全部" },
  { value: "privacy", label: "未脱敏" },
  { value: "content", label: "疑似缺字" },
  { value: "format", label: "页数边界" },
  { value: "history", label: "历史对比" },
];

const severityFilters: Array<{ value: SeverityFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "needs_review", label: "待复核" },
  { value: "ai_reviewing", label: "AI 评审" },
  { value: "disputed", label: "标记争议" },
  { value: "confirmed", label: "已确认" },
  { value: "rejected", label: "已驳回" },
];

const statusLabels: Record<ReviewStatus, string> = {
  needs_review: "待复核",
  ai_reviewing: "AI 评审",
  disputed: "标记争议",
  confirmed: "已确认",
  rejected: "已驳回",
};

const decisionMessages: Record<ReviewDecision, string> = {
  confirmed: "人工确认该问题成立。",
  rejected: "人工驳回该 AI 判断。",
  disputed: "人工标记为争议判断。",
};

const statusByDecision: Record<ReviewDecision, ReviewStatus> = {
  confirmed: "confirmed",
  rejected: "rejected",
  disputed: "disputed",
};

const screenshotIssueListIssues: QualityIssue[] = [
  {
    id: "screenshot-privacy-wangwu",
    index: 1,
    fileName: "王五_体检报告.pdf",
    group: "35-44",
    archiveId: "screenshot-001",
    page: "2",
    issueType: "未脱敏",
    category: "privacy",
    severity: "high",
    ruleId: "R-PRIVACY-003",
    evidence: "顶部身份证号完整可见",
    aiJudgement: "身份证号、手机号等敏感信息展示时应完成脱敏处理。",
    recommendation: "进入单报告详情查看页面框选、OCR 文本和结构化数据对应关系。",
    confidence: 0.96,
    status: "needs_review",
    foundAt: "2026-06-30 06:12:09",
    findingType: "privacy_leak",
    bbox: [68, 20, 24, 5],
  },
  {
    id: "screenshot-ocr-zhangsan",
    index: 2,
    fileName: "张三_体检报告.pdf",
    group: "35-44",
    archiveId: "screenshot-002",
    page: "3",
    issueType: "疑似缺字",
    category: "content",
    severity: "high",
    ruleId: "R-OCR-001",
    evidence: "谷丙转氨酶项目名疑似缺字",
    aiJudgement: "OCR 文本与原报告项目名不一致。",
    recommendation: "进入详情核对原图和结构化字段。",
    confidence: 0.94,
    status: "needs_review",
    foundAt: "2026-06-30 06:11:48",
    findingType: "missing_text",
  },
  {
    id: "screenshot-format-lisi",
    index: 3,
    fileName: "李四_体检报告.pdf",
    group: "45-54",
    archiveId: "screenshot-003",
    page: "1",
    issueType: "页数边界",
    category: "format",
    severity: "high",
    ruleId: "R-FORMAT-002",
    evidence: "PDF 仅 3 页，低于边界要求",
    aiJudgement: "页数低于同类报告边界，疑似缺页。",
    recommendation: "标记争议后进入详情复核原始文件。",
    confidence: 0.91,
    status: "disputed",
    foundAt: "2026-06-30 06:10:35",
    findingType: "format",
  },
  {
    id: "screenshot-history-zhaoliu",
    index: 4,
    fileName: "赵六_体检报告.pdf",
    group: "45-54",
    archiveId: "screenshot-004",
    page: "5",
    issueType: "历史对比",
    category: "history",
    severity: "medium",
    ruleId: "R-HISTORY-004",
    evidence: "血糖较上次升高但缺少前次表",
    aiJudgement: "历史趋势缺少前次指标或对比表。",
    recommendation: "确认历史记录来源后补齐对比证据。",
    confidence: 0.88,
    status: "confirmed",
    foundAt: "2026-06-30 06:09:22",
    findingType: "history_gap",
  },
  {
    id: "screenshot-ocr-liuqi",
    index: 5,
    fileName: "刘七_体检报告.pdf",
    group: "55-64",
    archiveId: "screenshot-005",
    page: "7",
    issueType: "疑似缺字",
    category: "content",
    severity: "medium",
    ruleId: "R-OCR-001",
    evidence: "白细胞计数一栏 OCR 不完整",
    aiJudgement: "表格局部文本缺失。",
    recommendation: "核对原始 PDF 图像。",
    confidence: 0.84,
    status: "needs_review",
    foundAt: "2026-06-30 06:08:43",
    findingType: "missing_text",
  },
  {
    id: "screenshot-privacy-sunba",
    index: 6,
    fileName: "孙八_体检报告.pdf",
    group: "25-34",
    archiveId: "screenshot-006",
    page: "1",
    issueType: "未脱敏",
    category: "privacy",
    severity: "high",
    ruleId: "R-PRIVACY-003",
    evidence: "手机号末四位之外信息可见",
    aiJudgement: "手机号展示超出允许范围。",
    recommendation: "进入详情确认脱敏规则。",
    confidence: 0.95,
    status: "needs_review",
    foundAt: "2026-06-30 06:07:19",
    findingType: "privacy_leak",
  },
  {
    id: "screenshot-format-wangwu",
    index: 7,
    fileName: "王五_体检报告.pdf",
    group: "35-44",
    archiveId: "screenshot-007",
    page: "3",
    issueType: "页数边界",
    category: "format",
    severity: "low",
    ruleId: "R-FORMAT-002",
    evidence: "表格被切分到下一页",
    aiJudgement: "跨页表格可能影响结构化提取。",
    recommendation: "已驳回时保留证据，不进入人工结论。",
    confidence: 0.72,
    status: "rejected",
    foundAt: "2026-06-30 06:06:02",
    findingType: "format",
  },
];
export function QualityShell({
  view = "batch",
  dataset,
  rules,
  assetSummary,
  exportSummary,
  issueListVariant = "default",
  reportDetailVariant = "default",
  reviewVariant = "default",
  rulesVariant = "default",
  exportVariant = "default",
}: {
  view?: QualityWorkspaceView;
  dataset?: QualityDatasetScan;
  rules?: QualityRuleSet;
  assetSummary?: QualityAssetSummary;
  exportSummary?: QualityExportSummary;
  issueListVariant?: IssueListVariant;
  reportDetailVariant?: ReportDetailVariant;
  reviewVariant?: ReviewVariant;
  rulesVariant?: RulesVariant;
  exportVariant?: ExportVariant;
}) {
  const meta = viewMeta[view];
  const initialMetrics = dataset?.metrics?.length ? dataset.metrics : fallbackMetrics;
  const [displayDatasetPath, setDisplayDatasetPath] = useState(dataset?.datasetPath?.replace(/\\/g, "/") ?? "D:/桌面/数据/5人");
  const [reviewedStatuses, setReviewedStatuses] = useState<Record<string, ReviewStatus>>({});
  const [importSummary, setImportSummary] = useState<QualityImportResponse | null>(null);
  const [importedIssues, setImportedIssues] = useState<QualityIssue[] | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<IssueCategory>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenuKey>(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState((dataset?.issues?.[0] ?? fallbackIssues[0])?.id ?? "");
  const [activePreviewPage, setActivePreviewPage] = useState(() => pageNumberFromIssue((dataset?.issues?.[0] ?? fallbackIssues[0]) as QualityIssue));
  const [isPaused, setIsPaused] = useState(false);
  const [operationMessage, setOperationMessage] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(true);
  const [selectedExportName, setSelectedExportName] = useState("第三批数据检测报告");
  const [isDatasetMenuOpen, setIsDatasetMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const baseIssues = (importedIssues ?? (dataset?.issues?.length ? dataset.issues : fallbackIssues)) as QualityIssue[];
  const issueSource = view === "review" && reviewVariant === "screenshot" ? screenshotIssueListIssues : issueListVariant === "screenshot" ? screenshotIssueListIssues : baseIssues;
  const metrics = importedIssues ? metricsFromIssues(initialMetrics, importedIssues) : initialMetrics;
  const scannedAt = dataset?.scannedAt ? formatScannedAt(dataset.scannedAt) : "2025-05-22 14:35:22";
  const ruleSet = rules?.rules?.length ? rules : { datasetPath: displayDatasetPath, sourceDocument: null, rules: prototypeRules };
  const summary = exportSummary ?? fallbackExportSummary;

  const allIssues = useMemo(
    () => issueSource.map((issue) => ({ ...issue, status: reviewedStatuses[issue.id] ?? issue.status })),
    [issueSource, reviewedStatuses],
  );

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allIssues.filter((issue) => {
      const searchable = `${issue.fileName} ${issue.issueType} ${issue.evidence} ${issue.ruleId} ${issueTypeLabel(issue)}`.toLowerCase();
      const matchesCategory = selectedFilter === "all" || issue.category === selectedFilter;
      const matchesSeverity = selectedSeverity === "all" || issue.severity === selectedSeverity;
      const matchesStatus = selectedStatus === "all" || issue.status === selectedStatus;
      return matchesCategory && matchesSeverity && matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [allIssues, query, selectedFilter, selectedSeverity, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / ISSUE_PAGE_SIZE));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pagedIssues = filteredIssues.slice((effectiveCurrentPage - 1) * ISSUE_PAGE_SIZE, effectiveCurrentPage * ISSUE_PAGE_SIZE);
  const selectedIssue =
    filteredIssues.find((issue) => issue.id === selectedIssueId) ??
    allIssues.find((issue) => issue.id === selectedIssueId) ??
    filteredIssues[0] ??
    allIssues[0];

  function handleSelectIssue(issueId: string) {
    const nextIssue = allIssues.find((issue) => issue.id === issueId) ?? filteredIssues.find((issue) => issue.id === issueId);
    setSelectedIssueId(issueId);
    setIsEvidenceOpen(true);
    setReviewFeedback("");
    if (nextIssue) {
      setActivePreviewPage(pageNumberFromIssue(nextIssue));
    }
  }

  async function recordReviewDecision(decision: ReviewDecision) {
    if (!selectedIssue) return;
    setReviewFeedback(`记录中：${decisionMessages[decision]}`);
    try {
      await fetch("/api/quality/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssue.id,
          decision,
          datasetPath: displayDatasetPath,
          message: decisionMessages[decision],
        }),
      });
    } catch {
      // Local review state still updates so the operator can continue triage offline.
    }
    setReviewedStatuses((current) => ({ ...current, [selectedIssue.id]: statusByDecision[decision] }));
    setReviewFeedback(`已记录：${decisionMessages[decision]}`);
  }

  async function handleImportFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    setIsImporting(true);
    setOperationMessage("正在导入数据清洗文件...");
    try {
      const response = await fetch("/api/quality/import", { method: "POST", body: formData });
      const data = (await response.json()) as QualityImportResponse;
      setImportSummary(data);
      setImportedIssues(null);
      setOperationMessage("文件导入完成。");
    } catch {
      setOperationMessage("导入文件失败：请检查后端服务或稍后重试。");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleStartCleaning() {
    if (!importSummary) return;
    setIsCleaning(true);
    setOperationMessage(`数据清洗任务已创建：${importSummary.total_files} 个文件进入目录扫描、PDF/OCR 和 Excel 字段证据流程。`);
    try {
      const response = await fetch(`/api/quality/import/${importSummary.task_id}/scan`, { method: "POST" });
      const data = (await response.json()) as QualityScanResponse;
      const nextIssues = (data.scan?.issues ?? []).map((issue) => mapBackendIssue(issue, importSummary.task_id));
      setImportedIssues(nextIssues);
      const primary = selectPrimaryImportedIssue(nextIssues);
      if (primary) {
        setSelectedIssueId(primary.id);
        setActivePreviewPage(pageNumberFromIssue(primary));
        setIsEvidenceOpen(true);
      }
      setOperationMessage(`数据清洗任务已完成：${importSummary.total_files} 个文件完成目录扫描，发现 ${nextIssues.length} 个疑似问题。`);
    } catch {
      setOperationMessage("数据清洗失败：请检查后端服务或稍后重试。");
    } finally {
      setIsCleaning(false);
    }
  }

  if (view === "issues" && issueListVariant === "screenshot") {
    return (
      <IssueListSnapshotPage
        issues={pagedIssues}
        totalIssues={filteredIssues.length}
        selectedIssue={selectedIssue}
        selectedIssueId={selectedIssue?.id}
        query={query}
        selectedFilter={selectedFilter}
        selectedSeverity={selectedSeverity}
        selectedStatus={selectedStatus}
        openFilterMenu={openFilterMenu}
        onQueryChange={(value) => {
          setQuery(value);
          setCurrentPage(1);
        }}
        onSelectFilter={(value) => {
          setSelectedFilter(value);
          setCurrentPage(1);
          setOpenFilterMenu(null);
        }}
        onSelectSeverity={(value) => {
          setSelectedSeverity(value);
          setCurrentPage(1);
          setOpenFilterMenu(null);
        }}
        onSelectStatus={(value) => {
          setSelectedStatus(value);
          setCurrentPage(1);
          setOpenFilterMenu(null);
        }}
        onToggleFilterMenu={setOpenFilterMenu}
        onSelectIssue={handleSelectIssue}
      />
    );
  }

  if (view === "detail" && reportDetailVariant === "screenshot") {
    return <SingleReportDetailSnapshotPage />;
  }

  if (view === "review" && reviewVariant === "screenshot") {
    return (
      <ManualReviewSnapshotPage
        issues={allIssues}
        selectedIssue={selectedIssue}
        selectedIssueId={selectedIssue?.id}
        reviewFeedback={reviewFeedback}
        onSelectIssue={handleSelectIssue}
        onReviewDecision={recordReviewDecision}
      />
    );
  }

  if (view === "rules" && rulesVariant === "screenshot") {
    return <RulesLibrarySnapshotPage />;
  }

  if (view === "export" && exportVariant === "screenshot") {
    return <ReportExportSnapshotPage exportSummary={summary} />;
  }
  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#202733]">
      <TopToolbar
        title={meta.title}
        isPaused={isPaused}
        operationMessage={operationMessage}
        onTogglePause={() => {
          setIsPaused((current) => !current);
          setOperationMessage(isPaused ? "任务已继续运行。" : "任务已暂停，当前结果保持可复核。");
        }}
        onRerun={() => setOperationMessage("已重新运行检测流程。")}
        onExport={() => setOperationMessage(`导出任务已创建：${selectedExportName}`)}
      />

      <main className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-3">
          <DatasetToolbar
            datasetPath={displayDatasetPath}
            scannedAt={scannedAt}
            ageGroupCount={metricValue(metrics, "年龄段")}
            isOpen={isDatasetMenuOpen}
            onToggle={() => setIsDatasetMenuOpen((current) => !current)}
            onSelect={(label) => {
              setDisplayDatasetPath(label === "历史对比样本" ? "D:/桌面/数据/历史对比样本" : "D:/桌面/数据/5人");
              setIsDatasetMenuOpen(false);
              setOperationMessage(`已切换数据集：${label}`);
            }}
          />

          {view === "batch" ? <MetricGrid metrics={metrics} /> : null}
          {view === "batch" ? <DetectionFlow /> : null}
          {view === "batch" && assetSummary ? <AssetInventoryPanel assetSummary={assetSummary} /> : null}
          {view === "batch" ? (
            <ImportCleaningPanel
              importSummary={importSummary}
              isImporting={isImporting}
              isCleaning={isCleaning}
              onImportFiles={handleImportFiles}
              onStartCleaning={handleStartCleaning}
            />
          ) : null}
          {view === "batch" && importedIssues?.length ? <CleaningResultPanel issues={importedIssues} onSelectIssue={handleSelectIssue} /> : null}

          {view === "detail" && selectedIssue ? (
            <ReportEvidenceWorkspace selectedIssue={selectedIssue} activePage={activePreviewPage} onSelectPage={setActivePreviewPage} />
          ) : null}
          {view === "review" ? <ReviewQueuePanel issues={allIssues} selectedIssue={selectedIssue} onSelectIssue={handleSelectIssue} /> : null}
          {view === "rules" ? <RulesPanel ruleSet={ruleSet} /> : null}
          {view === "export" ? (
            <ExportPanel
              selectedExportName={selectedExportName}
              datasetPath={displayDatasetPath}
              exportSummary={summary}
              onSelectExport={(name) => {
                setSelectedExportName(name);
                setOperationMessage(`已选择导出：${name}`);
              }}
            />
          ) : null}

          {view !== "rules" && view !== "export" && view !== "review" ? (
            <IssuePanel
              title={view === "issues" ? "问题列表" : meta.issueTitle}
              subtitle={view === "issues" ? "用于批量分诊和跳转详情" : meta.subtitle}
              issues={pagedIssues}
              allIssues={filteredIssues}
              totalIssues={filteredIssues.length}
              selectedIssueId={selectedIssue?.id}
              query={query}
              selectedFilter={selectedFilter}
              selectedSeverity={selectedSeverity}
              selectedStatus={selectedStatus}
              openFilterMenu={openFilterMenu}
              currentPage={effectiveCurrentPage}
              totalPages={totalPages}
              onQueryChange={(value) => {
                setQuery(value);
                setCurrentPage(1);
              }}
              onSelectFilter={(value) => {
                setSelectedFilter(value);
                setCurrentPage(1);
              }}
              onSelectSeverity={(value) => {
                setSelectedSeverity(value);
                setCurrentPage(1);
                setOpenFilterMenu(null);
              }}
              onSelectStatus={(value) => {
                setSelectedStatus(value);
                setCurrentPage(1);
                setOpenFilterMenu(null);
              }}
              onToggleFilterMenu={setOpenFilterMenu}
              onSelectPage={setCurrentPage}
              onSelectIssue={handleSelectIssue}
            />
          ) : null}
        </section>

        {view !== "rules" && view !== "export" && selectedIssue && isEvidenceOpen ? (
          <EvidencePanel
            issue={selectedIssue}
            activePage={activePreviewPage}
            view={view}
            reviewFeedback={reviewFeedback}
            onPreviewPageChange={setActivePreviewPage}
            onClose={() => setIsEvidenceOpen(false)}
            onReviewDecision={recordReviewDecision}
          />
        ) : null}
      </main>
    </div>
  );
}

function TopToolbar({ title, isPaused, operationMessage, onTogglePause, onRerun, onExport }: { title: string; isPaused: boolean; operationMessage: string; onTogglePause: () => void; onRerun: () => void; onExport: () => void }) {
  return (
    <header className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-[#dfe4ea] bg-white px-5 py-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-[#151922]">{title}</h1>
        {operationMessage ? <p role="status" className="mt-1 text-sm text-[#0b8b8b]">{operationMessage}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onTogglePause} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ccd5df] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f7f9fb]">
          <Pause aria-hidden="true" className="h-4 w-4" />{isPaused ? "继续任务" : "暂停任务"}
        </button>
        <button type="button" onClick={onRerun} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ccd5df] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f7f9fb]">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />重新运行
        </button>
        <button type="button" onClick={onExport} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0b9a9a] px-3 text-sm font-semibold text-white hover:bg-[#087f7f]">
          <Download aria-hidden="true" className="h-4 w-4" />导出结果
        </button>
        <div className="hidden items-center gap-2 border-l border-[#e4e9ef] pl-3 text-sm text-[#303846] md:flex">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef2f6] text-[#5e6978]">●</span>
          <span>admin</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#5e6978]" />
        </div>
      </div>
    </header>
  );
}

function DatasetToolbar({ datasetPath, scannedAt, ageGroupCount, isOpen, onToggle, onSelect }: { datasetPath: string; scannedAt: string; ageGroupCount?: string; isOpen: boolean; onToggle: () => void; onSelect: (label: string) => void }) {
  return (
    <section aria-label="数据集详情" className="relative flex flex-wrap items-center gap-4 bg-[#f5f7fb] py-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#202733]">数据集：</span>
        <button type="button" onClick={onToggle} className="inline-flex h-9 min-w-[190px] items-center justify-between gap-3 rounded-md border border-[#d9e0e8] bg-white px-3 font-semibold text-[#202733]">
          {datasetPath}<ChevronDown aria-hidden="true" className="h-4 w-4 text-[#5e6978]" />
        </button>
      </div>
      {isOpen ? (
        <div className="absolute left-[72px] top-11 z-20 w-56 rounded-md border border-[#d9e0e8] bg-white p-1 shadow-lg">
          <button type="button" onClick={() => onSelect("D:/桌面/数据/5人")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">D:/桌面/数据/5人</button>
          <button type="button" onClick={() => onSelect("历史对比样本")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">历史对比样本</button>
        </div>
      ) : null}
      <span className="text-[#6b7280]">更新时间： {scannedAt}</span>
      {ageGroupCount ? <span className="text-[#6b7280]">年龄段：{ageGroupCount}</span> : null}
      <RefreshCw aria-hidden="true" className="h-4 w-4 text-[#5e6978]" />
    </section>
  );
}
function MetricGrid({ metrics }: { metrics: QualityMetric[] }) {
  return (
    <section aria-label="质检指标" className="grid gap-3 md:grid-cols-5">
      {metrics.map((metric) => {
        const visual = metricVisualFor(metric);
        const Icon = visual.Icon;
        return (
          <div key={metric.label} className="flex min-h-[106px] items-center gap-4 rounded-lg border border-[#dfe4ea] bg-white px-5 py-4">
            <span role="img" aria-label={`${metric.label} 指标图标`} className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${visual.containerClassName}`}>
              <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <div className="text-3xl font-semibold leading-9 text-[#111827]">{metric.value}</div>
              <div className="mt-1 text-sm text-[#303846]">{metric.label}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function DetectionFlow() {
  const stages = [
    { label: "文件扫描", value: "28/28", state: "done" },
    { label: "Excel 解析", value: "5/5", state: "done" },
    { label: "PDF 转图", value: "28/28", state: "done" },
    { label: "AI 评审", value: "处理中 65%", state: "active" },
    { label: "人工复核", value: "待开始", state: "pending" },
  ];
  return (
    <section aria-label="检测流程" className="rounded-lg border border-[#dfe4ea] bg-white px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-5">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative flex items-center gap-3">
            <span className={stage.state === "done" ? "grid h-8 w-8 place-items-center rounded-full bg-[#37b26c] text-white" : stage.state === "active" ? "grid h-8 w-8 place-items-center rounded-full border-2 border-dotted border-[#0b9a9a] text-[#0b8b8b]" : "grid h-8 w-8 place-items-center rounded-full border border-[#94a3b8] text-[#64748b]"}>
              {stage.state === "done" ? <Check aria-hidden="true" className="h-5 w-5" /> : null}
            </span>
            <div>
              <div className="text-sm font-semibold text-[#0b8b8b]">{stage.label}</div>
              <div className="text-xs text-[#6b7280]">{stage.value}</div>
            </div>
            {index < stages.length - 1 ? <div className="hidden h-px flex-1 bg-[#0b9a9a] lg:block" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function AssetInventoryPanel({ assetSummary }: { assetSummary: QualityAssetSummary }) {
  return (
    <section aria-label="数据资产盘点" className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#151922]">数据资产盘点</h2>
        <span className="text-sm text-[#5e6978]">共 {assetSummary.totalArchives} 份档案</span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <InventoryPill label="已匹配档案" value={assetSummary.matchedArchives} tone="green" />
        <InventoryPill label="缺 PDF" value={assetSummary.missingPdfArchives} tone="red" />
        <InventoryPill label="缺 Excel" value={assetSummary.missingExcelArchives} tone="orange" />
        <InventoryPill label="少于 3 次记录" value={assetSummary.underThreeVisitArchives} tone="blue" />
      </div>
    </section>
  );
}

function InventoryPill({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "orange" | "blue" }) {
  const toneClass = tone === "green" ? "bg-[#ecfdf3] text-[#15803d]" : tone === "red" ? "bg-[#fff1f2] text-[#dc2626]" : tone === "orange" ? "bg-[#fff7ed] text-[#ea580c]" : "bg-[#eff6ff] text-[#1d4ed8]";
  return <div className={`rounded-md px-3 py-2 text-sm font-semibold ${toneClass}`}>{label} {value}</div>;
}

function ImportCleaningPanel({ importSummary, isImporting, isCleaning, onImportFiles, onStartCleaning }: { importSummary: QualityImportResponse | null; isImporting: boolean; isCleaning: boolean; onImportFiles: (files: FileList | null) => void; onStartCleaning: () => void }) {
  return (
    <section className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#151922]">导入数据清洗文件</h2>
          <p className="mt-1 text-sm text-[#5e6978]">支持 CSV、XLS、XLSX、PDF 和图片，导入后进入质检扫描。</p>
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#ccd5df] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f7f9fb]">
          <FileText aria-hidden="true" className="h-4 w-4" />
          导入文件
          <input aria-label="选择待清洗文件" type="file" multiple className="sr-only" onChange={(event) => void onImportFiles(event.currentTarget.files)} />
        </label>
      </div>
      {isImporting ? <p role="status" className="mt-3 text-sm text-[#0b8b8b]">正在导入文件...</p> : null}
      {importSummary ? (
        <div className="mt-3 rounded-md border border-[#eef2f6] bg-[#f8fafc] p-3">
          <div className="text-sm font-semibold text-[#202733]">已导入 {importSummary.total_files} 个文件</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {importSummary.files.map((file) => <span key={`${file.name}-${file.size}`} className="rounded-md border border-[#dfe4ea] bg-white px-2.5 py-1 text-xs text-[#475467]">{file.name}</span>)}
          </div>
          <button type="button" disabled={isCleaning} onClick={onStartCleaning} className="mt-3 inline-flex h-9 items-center rounded-md bg-[#0b9a9a] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isCleaning ? "清洗中..." : "开始数据清洗"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function CleaningResultPanel({ issues, onSelectIssue }: { issues: QualityIssue[]; onSelectIssue: (id: string) => void }) {
  const groups = groupCleaningIssues(issues);
  return (
    <section aria-label="清洗结果" className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#151922]">清洗结果</h2>
        <span className="text-sm text-[#5e6978]">发现 {issues.length} 个疑似问题</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label} aria-label={group.label} className="rounded-md border border-[#eef2f6] bg-[#f8fafc] p-3">
            <div className="text-sm font-semibold text-[#202733]">{group.heading}</div>
            <div className="mt-2 space-y-2">
              {group.issues.map((issue) => (
                <button key={issue.id} type="button" onClick={() => onSelectIssue(issue.id)} className="block w-full rounded-md bg-white px-3 py-2 text-left text-sm hover:bg-[#eefafa]">
                  <span className="font-semibold text-[#202733]">{issue.issueType}</span>
                  <span className="ml-2 text-xs text-[#6b7280]">{issue.fileName}</span>
                  <span className="mt-1 block text-xs text-[#5e6978]">{issue.evidence}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IssueListSnapshotPage({ issues, totalIssues, selectedIssue, selectedIssueId, query, selectedFilter, selectedSeverity, selectedStatus, openFilterMenu, onQueryChange, onSelectFilter, onSelectSeverity, onSelectStatus, onToggleFilterMenu, onSelectIssue }: { issues: QualityIssue[]; totalIssues: number; selectedIssue?: QualityIssue; selectedIssueId?: string; query: string; selectedFilter: IssueCategory; selectedSeverity: SeverityFilter; selectedStatus: StatusFilter; openFilterMenu: FilterMenuKey; onQueryChange: (value: string) => void; onSelectFilter: (value: IssueCategory) => void; onSelectSeverity: (value: SeverityFilter) => void; onSelectStatus: (value: StatusFilter) => void; onToggleFilterMenu: (value: FilterMenuKey) => void; onSelectIssue: (id: string) => void; }) {
  const activeIssue = selectedIssue ?? issues[0];
  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#111827]">
      <header className="flex min-h-[62px] items-center justify-between border-b border-[#d9e0e8] bg-white px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold leading-6 text-[#111827]">问题清单</h1>
          <p className="mt-1 text-sm leading-5 text-[#486179]">全局分诊，按风险类型、规则和状态定位问题，不在这里做人工作结论。</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">批量标记</button>
          <button type="button" className="h-9 rounded-md bg-[#0b9a9a] px-4 text-sm font-semibold text-white hover:bg-[#087f7f]">进入详情</button>
        </div>
      </header>

      <main className="space-y-3 p-4">
        <section aria-label="问题统计" className="grid gap-3 lg:grid-cols-4">
          <IssueStatCard title="疑似缺字" value="12" description="OCR 或页面标注证据不足" />
          <IssueStatCard title="页数边界" value="8" description="低于 5 页或报告拆分可疑" />
          <IssueStatCard title="疑似未脱敏" value="9" description="身份证、手机号、姓名等可见" />
          <IssueStatCard title="历史对比" value="8" description="缺少前次指标或对比表" />
        </section>

        <IssueListFilterBar
          query={query}
          selectedFilter={selectedFilter}
          selectedSeverity={selectedSeverity}
          selectedStatus={selectedStatus}
          openFilterMenu={openFilterMenu}
          onQueryChange={onQueryChange}
          onSelectFilter={onSelectFilter}
          onSelectSeverity={onSelectSeverity}
          onSelectStatus={onSelectStatus}
          onToggleFilterMenu={onToggleFilterMenu}
        />

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <IssueSnapshotTable issues={issues} totalIssues={totalIssues} selectedIssueId={selectedIssueId} onSelectIssue={onSelectIssue} />
          <TriageSummaryPanel issue={activeIssue} />
        </section>
      </main>
    </div>
  );
}

function IssueStatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="min-h-[112px] rounded-lg border border-[#d9e0e8] bg-white px-4 py-4">
      <div className="text-sm font-medium text-[#334d6b]">{title}</div>
      <div className="mt-1 text-2xl font-bold leading-8 text-[#020617]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[#486179]">{description}</div>
    </div>
  );
}

function IssueListFilterBar({ query, selectedFilter, selectedSeverity, selectedStatus, openFilterMenu, onQueryChange, onSelectFilter, onSelectSeverity, onSelectStatus, onToggleFilterMenu }: { query: string; selectedFilter: IssueCategory; selectedSeverity: SeverityFilter; selectedStatus: StatusFilter; openFilterMenu: FilterMenuKey; onQueryChange: (value: string) => void; onSelectFilter: (value: IssueCategory) => void; onSelectSeverity: (value: SeverityFilter) => void; onSelectStatus: (value: StatusFilter) => void; onToggleFilterMenu: (value: FilterMenuKey) => void; }) {
  return (
    <section className="rounded-lg border border-[#d9e0e8] bg-white p-2">
      <div className="grid gap-2 xl:grid-cols-[124px_124px_124px_124px_minmax(220px,1fr)_54px]">
        <MenuFilter label="问题类型" value={issueFilters.find((filter) => filter.value === selectedFilter)?.label ?? "全部"} open={openFilterMenu === "issue"} onToggle={() => onToggleFilterMenu(openFilterMenu === "issue" ? null : "issue")}>
          {issueFilters.map((filter) => (
            <button key={filter.value} role="menuitem" type="button" onClick={() => onSelectFilter(filter.value)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">
              {filter.label}
            </button>
          ))}
        </MenuFilter>
        <MenuFilter label="严重程度" value={severityFilters.find((filter) => filter.value === selectedSeverity)?.label ?? "全部"} open={openFilterMenu === "severity"} onToggle={() => onToggleFilterMenu(openFilterMenu === "severity" ? null : "severity")}>
          {severityFilters.map((filter) => <button key={filter.value} role="menuitem" type="button" onClick={() => onSelectSeverity(filter.value)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">{filter.label}</button>)}
        </MenuFilter>
        <button type="button" className="flex h-9 w-full items-center justify-between rounded-md border border-[#d9e0e8] bg-white px-3 text-sm text-[#202733]">年龄段：全部<ChevronDown aria-hidden="true" className="h-4 w-4 text-[#6b7280]" /></button>
        <MenuFilter label="处理状态" value={statusFilters.find((filter) => filter.value === selectedStatus)?.label ?? "全部"} open={openFilterMenu === "status"} onToggle={() => onToggleFilterMenu(openFilterMenu === "status" ? null : "status")}>
          {statusFilters.map((filter) => <button key={filter.value} role="menuitem" type="button" onClick={() => onSelectStatus(filter.value)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">{filter.label}</button>)}
        </MenuFilter>
        <label className="relative block">
          <span className="sr-only">关键词</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="请输入文件名、规则或证据关键词" className="h-9 w-full rounded-md border border-[#d9e0e8] bg-white pl-3 pr-9 text-sm text-[#202733] outline-none transition focus:border-[#0b9a9a]" />
          <Search aria-hidden="true" className="absolute right-3 top-2.5 h-4 w-4 text-[#6b7280]" />
        </label>
        <button type="button" className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">筛选</button>
      </div>
    </section>
  );
}

function IssueSnapshotTable({ issues, totalIssues, selectedIssueId, onSelectIssue }: { issues: QualityIssue[]; totalIssues: number; selectedIssueId?: string; onSelectIssue: (id: string) => void }) {
  return (
    <section className="min-h-[620px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
      <div className="flex h-16 items-center justify-between border-b border-[#d9e0e8] px-4">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">问题列表</h2>
          <p className="mt-0.5 text-sm text-[#486179]">用于批量分诊和跳转详情</p>
        </div>
        <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-1 text-xs font-semibold text-[#f97316]">37 条</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fafc] text-left text-[#486179]">
            <tr>
              <th className="px-3 py-3 font-medium">类型</th>
              <th className="px-3 py-3 font-medium">严重</th>
              <th className="px-3 py-3 font-medium">报告文件</th>
              <th className="px-3 py-3 font-medium">页码</th>
              <th className="px-3 py-3 font-medium">证据摘要</th>
              <th className="px-3 py-3 font-medium">规则</th>
              <th className="px-3 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#5e6978]">当前筛选条件下暂无质检问题。</td></tr>
            ) : issues.map((issue) => (
              <tr key={issue.id} className={issue.id === selectedIssueId ? "bg-[#eaf8f8]" : "bg-white"}>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3"><span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${issueTypeTone(issue)}`}>{issueTypeLabel(issue)}</span></td>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3"><SeverityBadge severity={issue.severity} /></td>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3"><button type="button" onClick={() => onSelectIssue(issue.id)} className="text-left text-[#16324f] hover:text-[#0b8b8b]">{issue.fileName}</button></td>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3 text-[#16324f]">{issue.page}</td>
                <td className="border-t border-[#e6ebf1] px-3 py-3 text-[#16324f]">{issue.evidence}</td>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3 text-[#16324f]">{issue.ruleId}</td>
                <td className="whitespace-nowrap border-t border-[#e6ebf1] px-3 py-3"><StatusBadge status={issue.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TriageSummaryPanel({ issue }: { issue?: QualityIssue }) {
  return (
    <aside aria-label="分诊证据摘要" className="min-h-[620px] rounded-lg border border-[#d9e0e8] bg-white">
      <div className="border-b border-[#d9e0e8] px-4 py-4">
        <h2 className="text-lg font-semibold text-[#111827]">分诊证据摘要</h2>
        <p className="mt-1 text-sm text-[#486179]">只辅助判断下一步，不做复核结论</p>
      </div>
      <div className="space-y-3 p-3">
        <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[#111827]">当前选中</h3>
            {issue ? <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${issueTypeTone(issue)}`}>{issueTypeLabel(issue)}</span> : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-[#486179]">{issue ? `${issue.fileName} 第 ${issue.page} 页，${issue.evidence}疑似未按规则遮挡。` : "请选择一条问题查看证据摘要。"}</p>
        </div>
        <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
          <h3 className="text-sm font-semibold text-[#111827]">命中规则</h3>
          <p className="mt-3 text-sm leading-6 text-[#486179]">{issue ? `${issue.ruleId}：${issue.aiJudgement}` : "暂无命中规则。"}</p>
        </div>
        <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
          <h3 className="text-sm font-semibold text-[#111827]">下一步</h3>
          <p className="mt-3 text-sm leading-6 text-[#486179]">{issue?.recommendation ?? "进入单报告详情查看页面框选、OCR 文本和结构化数据对应关系。"}</p>
        </div>
        <button type="button" className="h-9 w-full rounded-md bg-[#0b9a9a] text-sm font-semibold text-white hover:bg-[#087f7f]">查看单报告详情</button>
      </div>
    </aside>
  );
}
function IssuePanel({ title, subtitle, issues, allIssues, totalIssues, selectedIssueId, query, selectedFilter, selectedSeverity, selectedStatus, openFilterMenu, currentPage, totalPages, onQueryChange, onSelectFilter, onSelectSeverity, onSelectStatus, onToggleFilterMenu, onSelectPage, onSelectIssue }: { title: string; subtitle: string; issues: QualityIssue[]; allIssues: QualityIssue[]; totalIssues: number; selectedIssueId?: string; query: string; selectedFilter: IssueCategory; selectedSeverity: SeverityFilter; selectedStatus: StatusFilter; openFilterMenu: FilterMenuKey; currentPage: number; totalPages: number; onQueryChange: (value: string) => void; onSelectFilter: (value: IssueCategory) => void; onSelectSeverity: (value: SeverityFilter) => void; onSelectStatus: (value: StatusFilter) => void; onToggleFilterMenu: (value: FilterMenuKey) => void; onSelectPage: (page: number) => void; onSelectIssue: (id: string) => void; }) {
  const fileButtonNames = uniqueFileButtonNames(issues);
  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe4ea] bg-white">
      <div className="border-b border-[#eef2f6] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#151922]">{title}</h2>
            <span className="rounded bg-[#ef4444] px-1.5 py-0.5 text-xs font-semibold text-white">{totalIssues}</span>
          </div>
          <p className="text-sm text-[#5e6978]">{subtitle}</p>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-[180px_180px_180px_minmax(220px,1fr)_80px]">
          <MenuFilter label="问题类型" value={issueFilters.find((filter) => filter.value === selectedFilter)?.label ?? "全部"} open={openFilterMenu === "issue"} onToggle={() => onToggleFilterMenu(openFilterMenu === "issue" ? null : "issue")}>
            {issueFilters.map((filter) => (
              <button
                key={filter.value}
                role="menuitem"
                type="button"
                onClick={() => {
                  onSelectFilter(filter.value);
                  onToggleFilterMenu(null);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]"
              >
                {filter.label}
              </button>
            ))}
          </MenuFilter>
          <MenuFilter label="严重程度" value={severityFilters.find((filter) => filter.value === selectedSeverity)?.label ?? "全部"} open={openFilterMenu === "severity"} onToggle={() => onToggleFilterMenu(openFilterMenu === "severity" ? null : "severity")}>
            {severityFilters.map((filter) => <button key={filter.value} role="menuitem" type="button" onClick={() => { onSelectSeverity(filter.value); onToggleFilterMenu(null); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">{filter.label}</button>)}
          </MenuFilter>
          <MenuFilter label="处理状态" value={statusFilters.find((filter) => filter.value === selectedStatus)?.label ?? "全部"} open={openFilterMenu === "status"} onToggle={() => onToggleFilterMenu(openFilterMenu === "status" ? null : "status")}>
            {statusFilters.map((filter) => <button key={filter.value} role="menuitem" type="button" onClick={() => { onSelectStatus(filter.value); onToggleFilterMenu(null); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f5f8]">{filter.label}</button>)}
          </MenuFilter>
          <label className="relative block">
            <span className="sr-only">关键词</span>
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="请输入关键词" className="h-9 w-full rounded-md border border-[#d9e0e8] bg-white pl-3 pr-9 text-sm text-[#202733] outline-none transition focus:border-[#0b9a9a]" />
            <Search aria-hidden="true" className="absolute right-3 top-2.5 h-4 w-4 text-[#6b7280]" />
          </label>
          <button type="button" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#d9e0e8] bg-white px-3 text-sm text-[#344054]"><Filter aria-hidden="true" className="h-4 w-4" />筛选</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fafc] text-left text-[#5e6978]">
            <tr>
              <th className="w-10 px-4 py-3"><input aria-label="全选问题" type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1]" /></th>
              <th className="px-3 py-3 font-medium">序号</th>
              <th className="px-3 py-3 font-medium">问题类型</th>
              <th className="px-3 py-3 font-medium">严重程度</th>
              <th className="px-3 py-3 font-medium">报告文件</th>
              <th className="px-3 py-3 font-medium">页码</th>
              <th className="px-3 py-3 font-medium">问题描述</th>
              <th className="px-3 py-3 font-medium">AI 置信度</th>
              <th className="px-3 py-3 font-medium">处理状态</th>
              <th className="px-3 py-3 font-medium">发现时间</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#5e6978]">当前筛选条件下暂无质检问题。</td></tr>
            ) : issues.map((issue) => (
              <tr key={issue.id} className={issue.id === selectedIssueId ? "bg-[#f3f8ff]" : "bg-white"}>
                <td className="border-t border-[#eef2f6] px-4 py-3"><input aria-label={`选择 ${issue.fileName}`} type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1]" /></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3 text-[#475467]">{issue.index}</td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3"><span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${issueTypeTone(issue)}`}>{issueTypeLabel(issue)}</span></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3"><SeverityBadge severity={issue.severity} /></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3"><button type="button" onClick={() => onSelectIssue(issue.id)} className="text-left font-medium text-[#202733] hover:text-[#0b8b8b]">{fileButtonNames.get(issue.id) ?? issue.fileName}</button></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3 text-[#475467]">{issue.page}</td>
                <td className="max-w-[260px] border-t border-[#eef2f6] px-3 py-3 text-[#475467]"><p className="line-clamp-2">{issue.evidence}</p></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3 text-[#303846]">{issue.confidence.toFixed(2)}</td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3"><StatusBadge status={issue.status} /></td>
                <td className="whitespace-nowrap border-t border-[#eef2f6] px-3 py-3 text-[#475467]">{issue.foundAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-4 py-3 text-sm text-[#5e6978]">
        <span>共 {allIssues.length} 条</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={currentPage === 1} onClick={() => onSelectPage(Math.max(1, currentPage - 1))} className="rounded-md border border-[#d9e0e8] px-3 py-1.5 disabled:opacity-50">‹</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 4).map((page) => <button key={page} type="button" onClick={() => onSelectPage(page)} className={page === currentPage ? "rounded-md bg-[#0b9a9a] px-3 py-1.5 text-white" : "rounded-md border border-[#d9e0e8] px-3 py-1.5 text-[#344054]"}>{page}</button>)}
          <button type="button" disabled={currentPage === totalPages} onClick={() => onSelectPage(Math.min(totalPages, currentPage + 1))} className="rounded-md border border-[#d9e0e8] px-3 py-1.5 disabled:opacity-50">›</button>
          <span className="rounded-md border border-[#d9e0e8] bg-white px-3 py-1.5">10 条/页</span>
        </div>
      </div>
    </section>
  );
}
function MenuFilter({ label, value, open, onToggle, children }: { label: string; value: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="flex h-9 w-full items-center justify-between rounded-md border border-[#d9e0e8] bg-white px-3 text-sm text-[#202733]">
        {label}：{value}<ChevronDown aria-hidden="true" className="h-4 w-4 text-[#6b7280]" />
      </button>
      {open ? <div role="menu" className="absolute left-0 top-10 z-20 w-full rounded-md border border-[#d9e0e8] bg-white py-1 shadow-lg">{children}</div> : null}
    </div>
  );
}
function EvidencePanel({ issue, activePage, view, reviewFeedback, onPreviewPageChange, onClose, onReviewDecision }: { issue: QualityIssue; activePage: number; view: QualityWorkspaceView; reviewFeedback: string; onPreviewPageChange: (page: number) => void; onClose: () => void; onReviewDecision: (decision: ReviewDecision) => void }) {
  const pageCount = previewPageCountForIssue(issue);
  const previewSrc = previewImageForPage(issue, activePage);
  const issuePage = pageNumberFromIssue(issue);
  const shouldShowMarker = Boolean(issue.bbox) && (issue.page === "图片" || activePage === issuePage);
  return (
    <aside aria-label="当前问题证据" className="overflow-hidden rounded-lg border border-[#dfe4ea] bg-white">
      <div className="flex items-center justify-between border-b border-[#eef2f6] px-4 py-3">
        <h2 className="text-lg font-semibold text-[#151922]">证据详情</h2>
        <button type="button" aria-label="关闭证据详情" onClick={onClose} className="rounded p-1 text-[#5e6978] hover:bg-[#f2f5f8]"><X aria-hidden="true" className="h-4 w-4" /></button>
      </div>

      <section className="border-b border-[#eef2f6] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#202733]">体检报告页面预览</h3>
          <span className="text-xs text-[#475467]">第 {Math.min(activePage, pageCount)} / {pageCount} 页</span>
        </div>
        <div className="mt-3 rounded-md border border-[#d9e0e8] bg-[#f8fafc] p-2">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-2 py-1 text-xs text-[#475467]">
            <span>100%</span>
            {pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onPreviewPageChange(Math.max(1, activePage - 1))} className="rounded border border-[#d9e0e8] px-2 py-1">上一页</button>
                <button type="button" onClick={() => onPreviewPageChange(Math.min(pageCount, activePage + 1))} className="rounded border border-[#d9e0e8] px-2 py-1">下一页</button>
              </div>
            ) : null}
          </div>
          <div className="relative mt-2 flex aspect-[3/4] items-center justify-center overflow-hidden rounded border border-[#d9e0e8] bg-white">
            {previewSrc ? (
              <img src={previewSrc} alt={pageCount > 1 ? `${issue.fileName} 第 ${activePage} 页预览` : `${issue.fileName} 预览`} className="h-full w-full object-contain" />
            ) : (
              <MockReportPage />
            )}
            {shouldShowMarker && issue.bbox ? <EvidenceMarker issue={issue} /> : null}
          </div>
        </div>
      </section>

      <section className="border-b border-[#eef2f6] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-[#202733]">AI 判断</h3>
          <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${issueTypeTone(issue)}`}>{issue.issueType}</span>
          <span className="text-xs text-[#5e6978]">置信度： {issue.confidence.toFixed(2)}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#475467]">{issue.aiJudgement}</p>
      </section>

      <section className="border-b border-[#eef2f6] p-4">
        <h3 className="text-sm font-semibold text-[#202733]">规则依据</h3>
        <p className="mt-2 text-sm font-medium text-[#202733]">规则ID：{issue.ruleId}</p>
        <p className="mt-2 text-sm leading-6 text-[#475467]">{issue.evidence}</p>
      </section>

      <section className="border-b border-[#eef2f6] p-4">
        <h3 className="text-sm font-semibold text-[#202733]">处理建议</h3>
        <p className="mt-2 text-sm leading-6 text-[#475467]">{issue.recommendation}</p>
        {reviewFeedback ? <p role="status" className="mt-3 rounded-md bg-[#ecfdf3] px-3 py-2 text-sm font-semibold text-[#15803d]">{reviewFeedback}</p> : null}
      </section>

      <div className="grid grid-cols-3 gap-3 p-4">
        <button type="button" onClick={() => void onReviewDecision("confirmed")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#ef4444] text-sm font-semibold text-white"><Check aria-hidden="true" className="h-4 w-4" />确认问题</button>
        <button type="button" onClick={() => void onReviewDecision("rejected")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d9e0e8] bg-white text-sm font-medium text-[#344054]"><X aria-hidden="true" className="h-4 w-4" />驳回判断</button>
        <button type="button" onClick={() => void onReviewDecision("disputed")} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#2f6df6] bg-white text-sm font-medium text-[#2f6df6]">标记争议</button>
      </div>
    </aside>
  );
}

function MockReportPage() {
  return (
    <div className="w-[88%] bg-white p-4 text-center text-[11px] text-[#202733]">
      <h4 className="text-sm font-semibold">XX体检中心检验报告单</h4>
      <div className="mt-4 grid grid-cols-4 gap-2 text-left"><span>姓名：王五</span><span>性别：男</span><span>年龄号：</span><span className="bg-[#fee2e2] text-[#dc2626]">123456789012345678</span></div>
      <table className="mt-4 w-full border-collapse text-left"><tbody>{[["谷丙转氨酶(ALT)", "32", "9-50", "U/L"], ["谷草转氨酶(AST)", "28", "15-40", "U/L"], ["总胆固醇(TC)", "4.32", "2.90-5.20", "mmol/L"], ["甘油三酯(TG)", "1.82", "0.56-1.70", "mmol/L"], ["空腹血糖(FPG)", "6.58", "3.90-6.10", "mmol/L"]].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className={`border border-[#d9e0e8] px-2 py-1 ${index === 1 && cell === "6.58" ? "font-semibold text-[#dc2626]" : ""}`}>{cell}</td>)}</tr>)}</tbody></table>
      <p className="mt-4 text-[#6b7280]">--- 本页以下空白 ---</p>
    </div>
  );
}

function EvidenceMarker({ issue }: { issue: QualityIssue }) {
  const [x, y, w, h] = issue.bbox ?? [10, 10, 20, 10];
  return <div aria-label={`${evidenceLabelForIssue(issue)}标注：${issue.issueType}`} className="absolute rounded border-2 border-[#ef4444] bg-[#ef4444]/15" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />;
}

function SingleReportDetailSnapshotPage() {
  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#111827]">
      <header className="flex min-h-[62px] items-center justify-between border-b border-[#d9e0e8] bg-white px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold leading-6 text-[#111827]">单报告详情</h1>
          <p className="mt-1 text-sm leading-5 text-[#486179]">围绕一份报告核验证据链，证明每个判断都能追溯到文件、页码、字段和规则。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">上一份</button>
          <button type="button" className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">下一份</button>
          <button type="button" className="ml-1 h-9 rounded-md bg-[#0b9a9a] px-4 text-sm font-semibold text-white hover:bg-[#087f7f]">进入人工复核</button>
        </div>
      </header>

      <main className="grid gap-3 p-4 xl:grid-cols-[minmax(420px,1.25fr)_minmax(320px,0.95fr)_minmax(300px,0.9fr)]">
        <section aria-label="PDF 页面预览" className="min-h-[808px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="flex h-[66px] items-center justify-between border-b border-[#d9e0e8] px-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">PDF 页面预览</h2>
              <p className="mt-1 text-sm text-[#486179]">王五_体检报告.pdf，第 2 / 5 页</p>
            </div>
            <span className="rounded-md border border-[#fecdd3] bg-[#fff1f2] px-2.5 py-1 text-xs font-semibold text-[#dc2626]">未脱敏标注</span>
          </div>

          <div className="p-3">
            <div className="relative min-h-[520px] rounded-md border border-[#cfd8e3] bg-white px-7 py-8">
              <h3 className="text-center text-base font-semibold text-[#020617]">XX体检中心检验报告单</h3>
              <div className="mt-5 grid grid-cols-3 text-sm text-[#16324f]">
                <span>姓名：王五</span>
                <span>性别：男</span>
                <span>档案号：02496166</span>
              </div>
              <table className="mt-5 w-full border-collapse text-sm text-[#16324f]">
                <thead>
                  <tr className="bg-[#f8fafc] text-left">
                    <th className="border border-[#d9e0e8] px-3 py-2 font-medium">项目名称</th>
                    <th className="border border-[#d9e0e8] px-3 py-2 font-medium">结果</th>
                    <th className="border border-[#d9e0e8] px-3 py-2 font-medium">参考范围</th>
                    <th className="border border-[#d9e0e8] px-3 py-2 font-medium">单位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-[#d9e0e8] px-3 py-2">谷丙转氨酶</td><td className="border border-[#d9e0e8] px-3 py-2">32</td><td className="border border-[#d9e0e8] px-3 py-2">9-50</td><td className="border border-[#d9e0e8] px-3 py-2">U/L</td></tr>
                  <tr><td className="border border-[#d9e0e8] px-3 py-2">甘油三酯</td><td className="border border-[#d9e0e8] px-3 py-2">1.82</td><td className="border border-[#d9e0e8] px-3 py-2">0.56-1.70</td><td className="border border-[#d9e0e8] px-3 py-2">mmol/L</td></tr>
                  <tr><td className="border border-[#d9e0e8] px-3 py-2">空腹血糖</td><td className="border border-[#d9e0e8] px-3 py-2 font-semibold text-[#dc2626]">6.58</td><td className="border border-[#d9e0e8] px-3 py-2">3.90-6.10</td><td className="border border-[#d9e0e8] px-3 py-2">mmol/L</td></tr>
                </tbody>
              </table>
              <div aria-label="未脱敏标注框" className="absolute left-[61%] top-[176px] h-6 w-[28%] rounded-sm border-2 border-[#ef4444] bg-[#ef4444]/10" />
              <div aria-label="Excel 对照框" className="absolute left-[15%] top-[252px] h-9 w-[69%] rounded-sm border-2 border-[#2563eb] bg-[#2563eb]/10" />
            </div>
          </div>

          <div className="border-t border-[#e6ebf1] bg-[#f8fafc] p-3">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((page) => (
                <button key={page} type="button" className={page === 2 ? "h-[62px] rounded-md border border-[#0b9a9a] bg-[#e6f7f7] text-sm font-semibold text-[#0b8b8b]" : "h-[62px] rounded-md border border-[#d9e0e8] bg-white text-sm text-[#486179] hover:bg-[#f7f9fb]"}>第{page}页</button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="证据核查工作区" className="min-h-[808px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-lg font-semibold text-[#111827]">证据核查工作区</h2>
            <p className="mt-1 text-sm text-[#486179]">OCR、Excel、规则和历史线索并排校验</p>
          </div>
          <div className="space-y-3 p-3">
            <DetailEvidenceCard title="OCR 文本片段">第 2 页顶部识别到连续 18 位数字，位置接近身份信息栏。OCR 置信度 0.92，需要人工确认是否属于身份证号未脱敏。</DetailEvidenceCard>
            <DetailEvidenceCard title="结构化 Excel 对照">ArchivesNum=02496166，ItemResultChar 中存在空腹血糖偏高记录，PDF 页面与 Excel 档案号匹配。</DetailEvidenceCard>
            <DetailEvidenceCard title="命中规则">R-PRIVACY-003，敏感身份信息应保留前后必要位数，中间脱敏。当前页面未满足脱敏展示条件。</DetailEvidenceCard>
            <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#111827]">同报告问题</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded border border-[#fecdd3] bg-[#fff1f2] px-2 py-1 text-xs font-semibold text-[#dc2626]">未脱敏</span>
                <span className="rounded border border-[#fed7aa] bg-[#fff7ed] px-2 py-1 text-xs font-semibold text-[#ea580c]">页数边界</span>
                <span className="rounded border border-[#bfdbfe] bg-[#eff6ff] px-2 py-1 text-xs font-semibold text-[#1d4ed8]">历史对比</span>
              </div>
            </div>
            <div className="rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-3 py-3 text-sm leading-6 text-[#047857]">详情页不直接给最终复核结论，只把证据链整理清楚，降低人工复核时的来回跳转。</div>
          </div>
        </section>

        <section aria-label="AI 判断与建议" className="min-h-[808px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-lg font-semibold text-[#111827]">AI 判断与建议</h2>
            <p className="mt-1 text-sm text-[#486179]">面向复核人的证据摘要</p>
          </div>
          <div className="space-y-3 p-3">
            <DetailEvidenceCard title="AI 判断">页面存在疑似未脱敏个人身份信息，风险等级较为高。</DetailEvidenceCard>
            <DetailEvidenceCard title="处理建议">进入人工复核。不自动修改 PDF，不生成脱敏后文件。</DetailEvidenceCard>
            <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#111827]">证据完整性</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#15803d]">PDF 页图</span>
                <span className="rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#15803d]">OCR 文本</span>
                <span className="rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#15803d]">规则依据</span>
                <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-1 text-xs font-semibold text-[#2563eb]">Excel 对照</span>
              </div>
            </div>
            <button type="button" className="h-9 w-full rounded-md bg-[#0b9a9a] text-sm font-semibold text-white hover:bg-[#087f7f]">提交到人工复核</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ManualReviewSnapshotPage({ issues, selectedIssue, selectedIssueId, reviewFeedback, onSelectIssue, onReviewDecision }: { issues: QualityIssue[]; selectedIssue?: QualityIssue; selectedIssueId?: string; reviewFeedback: string; onSelectIssue: (id: string) => void; onReviewDecision: (decision: ReviewDecision) => void | Promise<void> }) {
  const queueIssues = [
    issues.find((issue) => issue.id === "screenshot-privacy-wangwu"),
    issues.find((issue) => issue.id === "screenshot-format-lisi"),
    issues.find((issue) => issue.id === "screenshot-ocr-zhangsan"),
  ].filter(Boolean) as QualityIssue[];
  const activeIssue = selectedIssue ?? queueIssues[0] ?? issues[0];

  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#111827]">
      <header className="flex min-h-[62px] items-center justify-between border-b border-[#d9e0e8] bg-white px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold leading-6 text-[#111827]">人工复核</h1>
          <p className="mt-1 text-sm leading-5 text-[#486179]">只处理人工决策：确认、驳回、标记争议和备注，记录复核差异。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">只看高风险</button>
          <button type="button" className="h-9 rounded-md bg-[#0b9a9a] px-4 text-sm font-semibold text-white hover:bg-[#087f7f]">保存复核记录</button>
        </div>
      </header>

      <main className="space-y-3 p-4">
        <section aria-label="复核统计" className="grid gap-3 lg:grid-cols-4">
          <ReviewStatCard title="待我复核" value="12" description="按高风险优先" />
          <ReviewStatCard title="争议问题" value="3" description="需要补证或二审" />
          <ReviewStatCard title="已确认" value="9" description="进入不合规清单" />
          <ReviewStatCard title="已驳回" value="2" description="保留驳回原因" />
        </section>

        <section className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)_360px]">
          <section className="min-h-[700px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
            <div className="border-b border-[#d9e0e8] px-4 py-4">
              <h2 className="text-lg font-semibold text-[#111827]">复核队列</h2>
              <p className="mt-1 text-sm text-[#486179]">从待复核和争议开始</p>
            </div>
            <div className="space-y-3 p-3">
              {queueIssues.map((issue) => (
                <button key={issue.id} type="button" onClick={() => onSelectIssue(issue.id)} className={issue.id === selectedIssueId ? "w-full rounded-lg border border-[#7dd3fc] bg-[#ecfeff] p-3 text-left" : "w-full rounded-lg border border-[#d9e0e8] bg-white p-3 text-left hover:bg-[#f7f9fb]"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-[#16324f]">{issue.fileName}</div>
                      <p className="mt-2 text-sm leading-5 text-[#486179]">{issue.evidence}，第 {issue.page} 页，{issue.ruleId}</p>
                    </div>
                    <SeverityBadge severity={issue.severity} />
                  </div>
                  <div className={issue.status === "disputed" ? "mt-3 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-center text-sm font-semibold text-[#2563eb]" : "mt-3 rounded-md border border-[#fdba74] bg-[#fff7ed] px-3 py-1.5 text-center text-sm font-semibold text-[#ea580c]"}>{statusLabels[issue.status]}</div>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="当前问题证据" className="min-h-[700px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
            <div className="border-b border-[#d9e0e8] px-4 py-4">
              <h2 className="text-lg font-semibold text-[#111827]">当前问题证据</h2>
              <p className="mt-1 text-sm text-[#486179]">复核时只展示与决策有关的证据</p>
            </div>
            <div className="p-3">
              <div className="relative min-h-[390px] rounded-md border border-[#cfd8e3] bg-white px-7 py-8">
                <h3 className="text-center text-base font-semibold text-[#020617]">XX体检中心检验报告单</h3>
                <div className="mt-5 grid grid-cols-3 text-sm text-[#16324f]">
                  <span>姓名：王五</span>
                  <span>性别：男</span>
                  <span>档案号：02496166</span>
                </div>
                <table className="mt-5 w-full border-collapse text-sm text-[#16324f]">
                  <tbody>
                    <tr><td className="border border-[#d9e0e8] px-3 py-2">项目</td><td className="border border-[#d9e0e8] px-3 py-2">结果</td><td className="border border-[#d9e0e8] px-3 py-2">范围</td><td className="border border-[#d9e0e8] px-3 py-2">单位</td></tr>
                    <tr><td className="border border-[#d9e0e8] px-3 py-2">身份证号</td><td className="border border-[#d9e0e8] px-3 py-2">123456...</td><td className="border border-[#d9e0e8] px-3 py-2">需脱敏</td><td className="border border-[#d9e0e8] px-3 py-2">-</td></tr>
                    <tr><td className="border border-[#d9e0e8] px-3 py-2">空腹血糖</td><td className="border border-[#d9e0e8] px-3 py-2 font-semibold text-[#dc2626]">6.58</td><td className="border border-[#d9e0e8] px-3 py-2">3.90-6.10</td><td className="border border-[#d9e0e8] px-3 py-2">mmol/L</td></tr>
                  </tbody>
                </table>
                <div aria-label="未脱敏标注框" className="absolute left-[58%] top-[96px] h-7 w-[29%] rounded-sm border-2 border-[#ef4444] bg-[#ef4444]/10" />
              </div>
              <div className="mt-3 rounded-md border border-[#d9e0e8] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#111827]">AI 判断</h3>
                <p className="mt-3 text-sm leading-6 text-[#486179]">疑似未脱敏，置信度 0.96。命中身份证号展示规则。</p>
              </div>
              <div className="mt-3 rounded-md border border-[#d9e0e8] bg-white p-3">
                <h3 className="text-sm font-semibold text-[#111827]">复核备注记录</h3>
                <p className="mt-3 text-sm leading-6 text-[#486179]">复核人 A：确认问题成立。复核人 B：建议补充第 1 页对比。</p>
              </div>
            </div>
          </section>

          <aside aria-label="复核决策" className="min-h-[700px] rounded-lg border border-[#d9e0e8] bg-white">
            <div className="border-b border-[#d9e0e8] px-4 py-4">
              <h2 className="text-lg font-semibold text-[#111827]">复核决策</h2>
              <p className="mt-1 text-sm text-[#486179]">复核决策队列</p>
            </div>
            <div className="space-y-3 p-3">
              <button type="button" onClick={() => void onReviewDecision("confirmed")} className="h-10 w-full rounded-md bg-[#ef4444] text-sm font-semibold text-white hover:bg-[#dc2626]">确认问题</button>
              <button type="button" onClick={() => void onReviewDecision("rejected")} className="h-10 w-full rounded-md border border-[#cfd8e3] bg-white text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">驳回判断</button>
              <button type="button" onClick={() => void onReviewDecision("disputed")} className="h-10 w-full rounded-md border border-[#93c5fd] bg-[#eff6ff] text-sm font-semibold text-[#2563eb] hover:bg-[#dbeafe]">标记争议</button>
              {reviewFeedback ? <p role="status" className="rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-3 py-2 text-sm font-semibold text-[#047857]">{reviewFeedback}</p> : null}
              <ReviewDecisionCard title="备注">身份证号中间部分未遮挡，建议列入未脱敏问题清单。无需自动修改原 PDF。</ReviewDecisionCard>
              <ReviewDecisionCard title="沉淀到规则">该复核结论可作为 R-PRIVACY-003 的样例证据，用于后续规则说明。</ReviewDecisionCard>
              {activeIssue ? <ReviewDecisionCard title="当前选中">{issueTypeLabel(activeIssue)}，{activeIssue.ruleId}，{activeIssue.recommendation}</ReviewDecisionCard> : null}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ReviewStatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="min-h-[96px] rounded-lg border border-[#d9e0e8] bg-white px-4 py-4">
      <div className="text-sm font-medium text-[#334d6b]">{title}</div>
      <div className="mt-1 text-2xl font-bold leading-8 text-[#020617]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[#486179]">{description}</div>
    </div>
  );
}

function ReviewDecisionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#486179]">{children}</p>
    </div>
  );
}
function DetailEvidenceCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#486179]">{children}</p>
    </div>
  );
}
function ReportEvidenceWorkspace({ selectedIssue, activePage, onSelectPage }: { selectedIssue: QualityIssue; activePage: number; onSelectPage: (page: number) => void }) {
  const pageCount = previewPageCountForIssue(selectedIssue);
  return (
    <section className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[#151922]">体检报告页面预览</h2><p className="mt-1 text-sm text-[#5e6978]">{selectedIssue.fileName}</p></div>
        <div className="grid grid-cols-3 gap-2"><EvidenceWorkspaceStat label="当前页" value={String(activePage)} /><EvidenceWorkspaceStat label="类型" value={issueTypeLabel(selectedIssue)} /><EvidenceWorkspaceStat label="状态" value={statusLabels[selectedIssue.status]} /></div>
      </div>
      <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed border-[#c9d4e0] bg-[#f8fafc] px-4 text-center text-sm text-[#5e6978]">已保留单报告页面证据，可在人工复核时放大查看。</div>
      {pageCount > 1 ? <div className="mt-4 flex flex-wrap gap-2">{Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button key={page} type="button" onClick={() => onSelectPage(page)} className={page === activePage ? "rounded-md bg-[#0b9a9a] px-3 py-1.5 text-sm font-medium text-white" : "rounded-md border border-[#ccd5df] px-3 py-1.5 text-sm text-[#344054]"}>第 {page} 页</button>)}</div> : null}
    </section>
  );
}

function EvidenceWorkspaceStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-[88px] rounded-lg bg-[#f8fafc] px-3 py-2 text-center"><div className="text-xs text-[#7b8794]">{label}</div><div className="mt-1 text-sm font-semibold text-[#202733]">{value}</div></div>;
}

function ReviewQueuePanel({ issues, selectedIssue, onSelectIssue }: { issues: QualityIssue[]; selectedIssue?: QualityIssue; onSelectIssue: (id: string) => void }) {
  return <section className="rounded-lg border border-[#dfe4ea] bg-white p-4"><h2 className="text-lg font-semibold text-[#151922]">人工复核队列</h2><p className="mt-1 text-sm text-[#5e6978]">优先处理高风险问题，并保留争议记录。</p><div className="mt-4 grid gap-3">{issues.map((issue) => <button key={issue.id} type="button" onClick={() => onSelectIssue(issue.id)} className={issue.id === selectedIssue?.id ? "rounded-lg border border-[#0b9a9a] bg-[#f3fbfb] p-4 text-left" : "rounded-lg border border-[#eef2f6] p-4 text-left"}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-[#202733]">{issue.fileName}</span><StatusBadge status={issue.status} /></div><p className="mt-2 text-sm text-[#5e6978]">{issue.evidence}</p></button>)}</div></section>;
}

function RulesLibrarySnapshotPage() {
  const categories = [
    { id: "privacy", name: "脱敏风险", count: "8", description: "姓名、身份证、手机号、机构编码" },
    { id: "format", name: "页数与格式", count: "6", description: "页数边界、表格断页、扫描质量" },
    { id: "content", name: "内容完整性", count: "10", description: "缺字、缺页、缺少总结和模块" },
    { id: "history", name: "历史对比", count: "5", description: "三次记录、五年内、指标趋势" },
  ] as const;
  const rules = [
    {
      id: "R-PRIVACY-003",
      name: "敏感身份信息脱敏",
      target: "PDF + OCR 文本",
      category: "privacy",
      severity: "高",
      status: "启用",
      source: "体检报告需求.docx，历史评估结论，人工复核样例 12 条。",
      failCondition: "身份证号、手机号、姓名、医生名、单位名等敏感信息在报告页面中完整或过度展示。",
      detectMethod: "PDF 转图后通过 OCR 和视觉模型定位敏感文本，保留页面框选坐标，不执行脱敏修改。",
      reviewLabels: ["需要复核", "高严重程度"],
      hits: 58,
    },
    {
      id: "R-FILE-001",
      name: "PDF + 结构化数据",
      target: "文件完整性",
      category: "format",
      severity: "高",
      status: "启用",
      source: "文件清单、结构化数据表、PDF 报告归档。",
      failCondition: "同一档案缺少 PDF 或结构化数据，导致报告和字段证据无法互相校验。",
      detectMethod: "按档案号扫描 PDF、Excel 和历史记录，生成缺失文件证据。",
      reviewLabels: ["需要复核", "高严重程度"],
      hits: 52,
    },
    {
      id: "R-FORMAT-002",
      name: "PDF 页数边界检查",
      target: "页面连续性",
      category: "format",
      severity: "高",
      status: "启用",
      source: "质检规则库，报告页数边界要求，人工复核样例 9 条。",
      failCondition: "报告页数低于阶段要求，或页码、目录、连续页面存在明显缺失。",
      detectMethod: "读取 PDF 页数并对首尾页做视觉检查，保留页数和页面截图证据。",
      reviewLabels: ["需要复核", "高严重程度"],
      hits: 49,
    },
    {
      id: "R-OCR-001",
      name: "OCR 证据完整性",
      target: "文字识别",
      category: "content",
      severity: "中",
      status: "待补齐",
      source: "OCR 识别日志，视觉模型抽检结果，人工复核样例 6 条。",
      failCondition: "关键体检项目、结论、医生建议区域无法被 OCR 稳定识别，或识别文本缺少上下文。",
      detectMethod: "对 PDF 页面进行 OCR 覆盖率检查，并使用视觉模型复核关键区域是否可读。",
      reviewLabels: ["需要复核", "证据待补齐"],
      hits: 36,
    },
    {
      id: "R-HISTORY-004",
      name: "历史指标对比证据",
      target: "历次结果",
      category: "history",
      severity: "中",
      status: "启用",
      source: "历史报告归档，五年内指标趋势表，人工复核样例 5 条。",
      failCondition: "报告提及历史对比，但缺少可追溯的历史指标、对比表或同档案号记录。",
      detectMethod: "按档案号匹配历史报告和结构化指标，检查页面是否展示对比证据。",
      reviewLabels: ["需要复核", "中严重程度"],
      hits: 42,
    },
    {
      id: "R-EXCEL-002",
      name: "结构化异常项识别",
      target: "Excel 指标",
      category: "content",
      severity: "中",
      status: "启用",
      source: "结构化体检数据，异常指标映射，人工复核样例 7 条。",
      failCondition: "Excel 存在异常指标，但 PDF 页面未展示对应解释或医生建议。",
      detectMethod: "比对 Excel 异常字段和 PDF 结论区域，生成字段级证据。",
      reviewLabels: ["需要复核", "中严重程度"],
      hits: 46,
    },
  ];
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]["id"] | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState(rules[0].id);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const queryText = query.trim().toLowerCase();
  const hydratedRules = rules.map((rule) => ({ ...rule, status: statusOverrides[rule.id] ?? rule.status }));
  const visibleRules = hydratedRules.filter((rule) => {
    const searchable = `${rule.id} ${rule.name} ${rule.target} ${rule.failCondition} ${rule.detectMethod}`.toLowerCase();
    if (queryText) return searchable.includes(queryText);
    return activeCategory === "all" || rule.category === activeCategory;
  });
  const selectedRule = hydratedRules.find((rule) => rule.id === selectedRuleId) ?? visibleRules[0] ?? hydratedRules[0];

  function selectCategory(category: (typeof categories)[number]["id"]) {
    setActiveCategory(category);
    setQuery("");
    const nextRule = hydratedRules.find((rule) => rule.category === category);
    if (nextRule) setSelectedRuleId(nextRule.id);
  }

  function updateQuery(value: string) {
    setQuery(value);
    const normalized = value.trim().toLowerCase();
    const nextRule = hydratedRules.find((rule) => `${rule.id} ${rule.name} ${rule.target} ${rule.failCondition} ${rule.detectMethod}`.toLowerCase().includes(normalized));
    if (normalized && nextRule) setSelectedRuleId(nextRule.id);
  }

  function toggleRuleStatus(ruleId: string) {
    const rule = hydratedRules.find((item) => item.id === ruleId);
    if (!rule) return;
    const nextStatus = rule.status === "启用" ? "待补齐" : "启用";
    setStatusOverrides((current) => ({ ...current, [ruleId]: nextStatus }));
    setMessage(`${ruleId} 已切换为${nextStatus}`);
  }

  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#111827]">
      <header className="flex min-h-[62px] items-center justify-between border-b border-[#d9e0e8] bg-white px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold leading-6 text-[#111827]">规则库</h1>
          <p className="mt-1 text-sm leading-5 text-[#486179]">维护可执行的质检规则，说明来源、检测方法、失败条件和是否需要人工复核。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMessage("已打开需求文档导入入口")} className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">导入需求文档</button>
          <button type="button" onClick={() => setMessage("已创建一条草稿规则")} className="h-9 rounded-md bg-[#0b9a9a] px-4 text-sm font-semibold text-white hover:bg-[#087f7f]">新增规则</button>
        </div>
      </header>

      {message ? <div role="status" className="border-b border-[#d9e0e8] bg-[#ecfeff] px-6 py-2 text-sm font-semibold text-[#0f766e]">{message}</div> : null}

      <main className="grid min-h-[calc(100vh-62px)] gap-3 p-3 lg:grid-cols-[270px_minmax(420px,1fr)_370px]">
        <section className="overflow-hidden rounded-md border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-base font-semibold text-[#111827]">规则分类</h2>
            <p className="mt-1 text-xs text-[#486179]">按检测维度治理规则</p>
          </div>
          <div className="space-y-2 p-3">
            {categories.map((category) => {
              const isActive = category.id === activeCategory && !queryText;
              return (
                <button key={category.id} type="button" aria-pressed={isActive} onClick={() => selectCategory(category.id)} className={isActive ? "w-full rounded-md border border-[#8bdede] bg-[#ecfeff] p-3 text-left" : "w-full rounded-md border border-[#d9e0e8] bg-white p-3 text-left hover:bg-[#f7f9fb]"}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#16324f]">{category.name}</h3>
                    <span className="rounded-md border border-[#d9e0e8] bg-[#f8fafc] px-2 py-0.5 text-xs font-semibold text-[#0b5c8f]">{category.count}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#486179]">{category.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-[#d9e0e8] bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-[#d9e0e8] px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">规则列表</h2>
              <p className="mt-1 text-xs text-[#486179]">规则来自需求文档，也来自人工复核沉淀</p>
            </div>
            <label className="flex h-9 w-[238px] items-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm text-[#486179]">
              <Search aria-hidden="true" className="h-4 w-4 text-[#94a3b8]" />
              <input aria-label="搜索规则" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="搜索规则 ID 或失败条件" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94a3b8]" />
            </label>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              {visibleRules.map((rule) => {
                const isActive = rule.id === selectedRule.id;
                return (
                  <div key={rule.id} className={isActive ? "grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-[#8bdede] bg-[#ecfeff] px-3 py-2" : "grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-[#d9e0e8] bg-white px-3 py-2 hover:bg-[#f7f9fb]"}>
                    <button type="button" aria-label={`查看规则 ${rule.id}`} onClick={() => setSelectedRuleId(rule.id)} className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-2 text-left">
                      <span className="truncate text-xs font-semibold text-[#111827]">{rule.id}</span>
                      <span className="truncate text-xs text-[#16324f]">{rule.name}</span>
                    </button>
                    <span className={rule.severity === "高" ? "rounded border border-[#fecdd3] bg-[#fff1f2] px-7 py-1 text-center text-xs font-semibold text-[#dc2626]" : "rounded border border-[#bfdbfe] bg-[#eff6ff] px-7 py-1 text-center text-xs font-semibold text-[#2563eb]"}>{rule.severity}</span>
                    <button type="button" aria-label={`切换 ${rule.id} 状态`} onClick={() => toggleRuleStatus(rule.id)} className={rule.status === "启用" ? "rounded border border-[#bbf7d0] bg-[#ecfdf3] px-7 py-1 text-xs font-semibold text-[#15803d]" : "rounded border border-[#fed7aa] bg-[#fff7ed] px-5 py-1 text-xs font-semibold text-[#ea580c]"}>{rule.status}</button>
                  </div>
                );
              })}
            </div>
            {visibleRules.length === 0 ? <div className="rounded-md border border-dashed border-[#cfd8e3] p-6 text-center text-sm text-[#486179]">未找到匹配规则。</div> : null}
            <div className="mt-3 overflow-hidden rounded-md border border-[#d9e0e8] bg-white">
              <div className="flex h-[128px] items-end gap-3 bg-[linear-gradient(90deg,#f5f7fb_0,#f5f7fb_48%,#fff_48%,#fff_100%)] bg-[length:76px_100%] px-5 pb-5 pt-3">
                {[44, 68, 28, 57, 82, 46].map((height, index) => (
                  <div key={index} className="w-8 rounded-t bg-[#0b9a9a]/80" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-md border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-base font-semibold text-[#111827]">规则详情</h2>
            <p className="mt-1 text-xs text-[#486179]">当前选中：{selectedRule.id}</p>
          </div>
          <div className="space-y-3 p-3">
            <RuleDetailCard title="来源">{selectedRule.source}</RuleDetailCard>
            <RuleDetailCard title="失败条件">{selectedRule.failCondition}</RuleDetailCard>
            <RuleDetailCard title="检测方法">{selectedRule.detectMethod}</RuleDetailCard>
            <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#111827]">人工复核要求</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRule.reviewLabels.map((label) => (
                  <span key={label} className={label.includes("高") ? "rounded-md border border-[#fecdd3] bg-[#fff1f2] px-2 py-1 text-xs font-semibold text-[#dc2626]" : "rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#15803d]"}>{label}</span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setMessage(`${selectedRule.id} 规则说明已保存`)} className="h-9 w-full rounded-md bg-[#0b9a9a] text-sm font-semibold text-white hover:bg-[#087f7f]">保存规则说明</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
function RuleDetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d9e0e8] bg-white p-3">
      <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#486179]">{children}</p>
    </div>
  );
}
function RulesPanel({ ruleSet }: { ruleSet: QualityRuleSet }) {
  const [selectedRuleId, setSelectedRuleId] = useState(ruleSet.rules[0]?.ruleId ?? "");
  const selectedRule = ruleSet.rules.find((rule) => rule.ruleId === selectedRuleId) ?? ruleSet.rules[0];
  const sourceLabel = ruleSet.sourceDocument ? ruleSet.sourceDocument.split(/[\\/]/).filter(Boolean).at(-1) : "";
  return (
    <section className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#151922]">规则列表</h2><p className="mt-1 text-sm text-[#5e6978]">当前问题清单使用的检测规则摘要。</p>{sourceLabel ? <p className="mt-1 text-xs font-semibold text-[#0b8b8b]">规则来源：{sourceLabel}</p> : null}</div><div className="rounded-md bg-[#f8fafc] px-3 py-2 text-sm text-[#5e6978]">共 {ruleSet.rules.length} 条规则</div></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"><div className="space-y-3">{ruleSet.rules.map((rule) => <button key={rule.ruleId} type="button" onClick={() => setSelectedRuleId(rule.ruleId)} className={rule.ruleId === selectedRule?.ruleId ? "w-full rounded-lg border border-[#0b9a9a] bg-[#f3fbfb] p-4 text-left" : "w-full rounded-lg border border-[#eef2f6] bg-white p-4 text-left"}><div className="text-sm font-semibold text-[#202733]">{rule.ruleId}</div></button>)}</div>{selectedRule ? <div className="rounded-lg border border-[#eef2f6] bg-[#f8fafc] p-4"><h3 className="text-sm font-semibold text-[#151922]">规则详情</h3><div className="mt-3 space-y-3 text-sm text-[#475467]"><SummaryBlock label="规则名称" value={selectedRule.ruleName} /><SummaryBlock label="检测方式" value={selectedRule.detectMethod} /><SummaryBlock label="人工复核" value={selectedRule.needHumanReview ? "需要人工复核" : "无需人工复核"} /></div></div> : null}</div>
    </section>
  );
}

function ReportExportSnapshotPage({ exportSummary }: { exportSummary: QualityExportSummary }) {
  const deliverables = [
    { title: "第三批数据检测报告", description: "PDF，总结、方法、风险分布和结论" },
    { title: "不合规问题清单", description: "Excel，已确认问题和证据摘要" },
    { title: "可能合规清单", description: "人工驳回和低风险样本" },
    { title: "人工复核记录", description: "确认、驳回、争议和备注" },
    { title: "证据截图索引", description: "文件、页码、框选位置和规则 ID" },
  ];
  const previewRows = [
    { section: "风险摘要", content: "缺字、页数、未脱敏、历史对比", count: "4 类", format: "PDF" },
    { section: "问题明细", content: "文件、页码、证据、规则、状态", count: `${exportSummary.totalIssues} 条`, format: "Excel" },
    { section: "复核记录", content: "复核人、决策、备注、时间", count: `${exportSummary.reviewRecordCount} 条`, format: "Excel" },
    { section: "规则统计", content: "规则命中、严重程度、来源", count: "15 条", format: "Excel" },
    { section: "证据索引", content: "页面截图路径和框选坐标", count: `${exportSummary.evidenceImageCount} 张`, format: "ZIP" },
  ];
  const records = [
    { date: "2025-05-22", title: "第三批检测报告", status: "完成", tone: "success" },
    { date: "2025-05-22", title: "不合规问题清单", status: "完成", tone: "success" },
    { date: "2025-05-21", title: "人工复核记录", status: "复核版", tone: "info" },
    { date: "2025-05-20", title: "规则命中统计", status: "草稿", tone: "draft" },
  ];

  return (
    <div className="min-h-full bg-[#f5f7fb] text-[#111827]">
      <header className="flex min-h-[62px] items-center justify-between border-b border-[#d9e0e8] bg-white px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold leading-6 text-[#111827]">报告导出</h1>
          <p className="mt-1 text-sm leading-5 text-[#486179]">把筛查结果、复核记录、规则命中统计和证据索引整理成可交付文件。</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-9 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#16324f] hover:bg-[#f7f9fb]">预览交付包</button>
          <button type="button" className="h-9 rounded-md bg-[#0b9a9a] px-4 text-sm font-semibold text-white hover:bg-[#087f7f]">导出结果</button>
        </div>
      </header>

      <main className="grid gap-3 p-4" style={{ gridTemplateColumns: "minmax(0,1.18fr) minmax(0,1.09fr) minmax(0,1fr)" }}>
        <section className="min-h-[807px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-lg font-semibold text-[#111827]">交付物选择</h2>
            <p className="mt-1 text-sm text-[#486179]">选择本次要导出的文件</p>
          </div>
          <div className="space-y-3 p-3">
            {deliverables.map((item) => (
              <button key={item.title} type="button" className="flex w-full items-start justify-between gap-3 rounded-lg border border-[#d9e0e8] bg-white p-3 text-left hover:bg-[#f7f9fb]">
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-[#0b9a9a] text-[#0b9a9a]"><Check aria-hidden="true" className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold leading-6 text-[#16324f]">{item.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-[#486179]">{item.description}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-md border border-[#bbf7d0] bg-[#ecfdf3] px-2 py-1 text-xs font-semibold text-[#15803d]">已选</span>
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-[807px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-[#d9e0e8] px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">导出预览</h2>
              <p className="mt-1 text-sm text-[#486179]">面向交付的汇总，不再做分析操作</p>
            </div>
            <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">第三批数据</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2">
              <ExportSnapshotMetric label="总问题" value={String(exportSummary.totalIssues)} description="进入导出范围" />
              <ExportSnapshotMetric label="已确认" value={String(exportSummary.confirmedIssues)} description="不合规清单" />
              <ExportSnapshotMetric label="待复核" value={String(exportSummary.pendingIssues)} description="单独列出" />
              <ExportSnapshotMetric label="争议" value="3" description="附复核意见" />
            </div>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-[#d9e0e8] bg-[#f8fafc] text-left text-[#486179]">
                  <th className="px-3 py-3 font-semibold">导出章节</th>
                  <th className="px-3 py-3 font-semibold">内容</th>
                  <th className="px-3 py-3 font-semibold">数量</th>
                  <th className="px-3 py-3 font-semibold">格式</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.section} className="border-b border-[#e6ebf1]">
                    <td className="px-3 py-3 font-semibold text-[#16324f]">{row.section}</td>
                    <td className="px-3 py-3 leading-5 text-[#111827]">{row.content}</td>
                    <td className="px-3 py-3 text-[#111827]">{row.count}</td>
                    <td className="px-3 py-3 text-[#111827]">{row.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 rounded-lg border border-[#a7f3d0] bg-[#ecfdf3] px-3 py-3 text-sm leading-6 text-[#047857]">导出页只处理交付范围和文件格式，不提供复核按钮，避免和人工复核页面重复。</div>
          </div>
        </section>

        <aside className="min-h-[807px] overflow-hidden rounded-lg border border-[#d9e0e8] bg-white">
          <div className="border-b border-[#d9e0e8] px-4 py-4">
            <h2 className="text-lg font-semibold text-[#111827]">导出记录</h2>
            <p className="mt-1 text-sm text-[#486179]">保留每次交付版本</p>
          </div>
          <div className="p-3">
            <div className="space-y-0">
              {records.map((record) => (
                <div key={`${record.date}-${record.title}`} className="flex items-center justify-between gap-3 border-b border-[#e6ebf1] px-1 py-4 last:border-b-0">
                  <span className="text-sm text-[#486179]">{record.date}</span>
                  <span className="text-sm font-semibold text-[#16324f]">{record.title}</span>
                  <ExportStatusChip status={record.status} tone={record.tone} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#d9e0e8] bg-white p-3">
              <h3 className="text-sm font-semibold text-[#111827]">本次导出配置</h3>
              <p className="mt-3 text-sm leading-6 text-[#486179]">包含已确认、待复核、标记争议和已驳回记录。证据截图以索引方式随 ZIP 输出。</p>
            </div>
            <button type="button" className="mt-3 h-10 w-full rounded-md bg-[#0b9a9a] text-sm font-semibold text-white hover:bg-[#087f7f]">生成交付包</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ExportSnapshotMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="min-h-[114px] rounded-md border border-[#d9e0e8] bg-white px-3 py-3">
      <div className="text-sm text-[#486179]">{label}</div>
      <div className="mt-2 text-3xl font-bold leading-8 text-[#020617]">{value}</div>
      <div className="mt-2 text-sm leading-5 text-[#486179]">{description}</div>
    </div>
  );
}

function ExportStatusChip({ status, tone }: { status: string; tone: string }) {
  const className = tone === "success" ? "border-[#bbf7d0] bg-[#ecfdf3] text-[#16a34a]" : tone === "info" ? "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]" : "border-[#d9e0e8] bg-[#f8fafc] text-[#486179]";
  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}
function ExportPanel({ selectedExportName, datasetPath, onSelectExport, exportSummary }: { selectedExportName: string; datasetPath: string; onSelectExport: (name: string) => void; exportSummary: QualityExportSummary }) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => Object.fromEntries(exportDeliverables.map((item) => [item, true])));
  const [exportStatus, setExportStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const selectedCount = exportDeliverables.filter((item) => selectedItems[item]).length;
  const sectionByTitle = useMemo(() => new Map(exportSummary.sections.map((section) => [section.title, section])), [exportSummary.sections]);
  const ruleHitCount = exportSummary.ruleHits.length > 0 ? exportSummary.ruleHits.length : (exportSummary.sections.find((section) => section.key === "rule-hit-stats")?.itemCount ?? 0);
  async function createExportPackage() {
    const selectedSections = Array.from(new Set(exportDeliverables.filter((item) => selectedItems[item]).flatMap((item) => exportDeliverableSectionKeys[item] ?? [])));
    setIsExporting(true); setDownloadUrl(""); setExportStatus("正在生成交付包...");
    try {
      const response = await fetch("/api/quality/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ export_type: selectedExportName, dataset_path: exportSummary.datasetPath || datasetPath, selected_sections: selectedSections }) });
      const data = (await response.json()) as Partial<QualityExportTaskResponse>;
      if (!response.ok || typeof data.message !== "string") throw new Error("quality export request failed");
      setExportStatus(data.message); setDownloadUrl(typeof data.download_url === "string" ? data.download_url : "");
    } catch { setExportStatus("生成交付包失败：请检查后端服务或稍后重试。"); setDownloadUrl(""); } finally { setIsExporting(false); }
  }
  return (
    <section aria-label="报告导出原型" className="rounded-lg border border-[#dfe4ea] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#151922]">报告导出</h2><p className="mt-1 text-sm text-[#5e6978]">导出页只负责交付范围、文件格式和版本记录。</p></div><span className="rounded-md bg-[#eefafa] px-2.5 py-1 text-xs font-semibold text-[#0b8b8b]">已选择 {selectedCount} 项交付物</span></div>
      <p className="mt-3 text-sm font-medium text-[#0b8b8b]">当前导出类型：{selectedExportName}</p>
      {exportStatus ? <div role="status" className="mt-2 rounded-md border border-[#bde8cf] bg-[#ecfbf2] px-3 py-2 text-sm font-semibold text-[#208a4c]"><span>{exportStatus}</span>{downloadUrl ? <a href={downloadUrl} className="ml-3 underline underline-offset-2">下载交付包</a> : null}</div> : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]"><div className="space-y-3">{exportDeliverables.map((item) => { const liveSection = sectionByTitle.get(item); return <div key={item} className="rounded-md border border-[#dfe4ea] bg-[#f7f9fb] p-3"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#0b9a9a]" checked={Boolean(selectedItems[item])} onChange={() => setSelectedItems((current) => ({ ...current, [item]: !current[item] }))} aria-label={item} /><span className="min-w-0"><span className="block text-sm font-semibold text-[#202733]">{item}</span><span className="mt-1 block text-xs leading-5 text-[#5e6978]">{liveSection?.description ?? exportDescriptionFor(item)}</span></span></label><button type="button" onClick={() => onSelectExport(item)} className="mt-3 rounded-md border bg-white px-3 py-1.5 text-xs font-semibold text-[#303846]">{item}</button></div>; })}</div><div className="space-y-3"><div className="rounded-md border border-[#dfe4ea] bg-[#f7f9fb] p-4"><h3 className="text-sm font-semibold text-[#151922]">导出预览</h3><table className="mt-3 w-full border-collapse text-sm"><tbody><tr className="border-b border-[#dfe4ea]"><td className="py-2 text-[#5e6978]">问题明细</td><td className="py-2 text-right font-semibold">{exportSummary.totalIssues} 条</td></tr><tr className="border-b border-[#dfe4ea]"><td className="py-2 text-[#5e6978]">复核记录</td><td className="py-2 text-right font-semibold">{exportSummary.reviewRecordCount} 条</td></tr><tr className="border-b border-[#dfe4ea]"><td className="py-2 text-[#5e6978]">规则命中</td><td className="py-2 text-right font-semibold">{ruleHitCount} 条</td></tr><tr><td className="py-2 text-[#5e6978]">证据截图</td><td className="py-2 text-right font-semibold">{exportSummary.evidenceImageCount} 张</td></tr></tbody></table></div><div className="rounded-md border border-[#dfe4ea] bg-white p-4"><div className="text-sm text-[#5e6978]">复核记录</div><h3 className="mt-1 text-sm font-semibold text-[#151922]">交付范围</h3><div className="mt-3 space-y-3">{exportSummary.sections.map((section) => <div key={section.key} className="rounded-md border border-[#eef2f6] bg-[#f7f9fb] px-3 py-2"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#202733]">{section.title}</span><span className="text-xs font-semibold text-[#0b8b8b]">{section.itemCount}</span></div><p className="mt-1 text-xs leading-5 text-[#5e6978]">{section.description}</p></div>)}</div></div><button type="button" disabled={isExporting || selectedCount === 0} onClick={() => void createExportPackage()} className="w-full rounded-md bg-[#0b9a9a] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isExporting ? "生成中..." : "生成交付包"}</button></div></div>
    </section>
  );
}
function SummaryBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#eef2f6] p-4"><div className="text-xs font-medium text-[#7b8794]">{label}</div><p className="mt-2 text-sm text-[#202733]">{value}</p></div>;
}

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const label = severity === "high" ? "高" : severity === "medium" ? "中" : "低";
  const className = severity === "high" ? "bg-[#fff1f2] text-[#dc2626] border-[#fecdd3]" : severity === "medium" ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]" : "bg-[#ecfdf3] text-[#15803d] border-[#bbf7d0]";
  return <span aria-label={`严重程度：${label}`} className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span aria-label={`处理状态：${statusLabels[status]}`} className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusTone(status)}`}>{statusLabels[status]}</span>;
}

function metricVisualFor(metric: QualityMetric) {
  if (metric.label === "PDF") return { Icon: FileText, containerClassName: "bg-[#eaf2ff] text-[#245dbf]" };
  if (metric.label === "Excel") return { Icon: FileSpreadsheet, containerClassName: "bg-[#eaf8ef] text-[#15803d]" };
  if (metric.label === "问题") return { Icon: TriangleAlert, containerClassName: "bg-[#fff4e5] text-[#f97316]" };
  if (metric.label === "待复核") return { Icon: ClipboardCheck, containerClassName: "bg-[#fef2f2] text-[#ef4444]" };
  return { Icon: Users, containerClassName: "bg-[#ecfeff] text-[#0f766e]" };
}

function statusTone(status: ReviewStatus) {
  if (status === "confirmed") return "bg-[#ecfdf3] text-[#15803d] border-[#bbf7d0]";
  if (status === "rejected") return "bg-[#f7f9fb] text-[#5e6978] border-[#d9e0e8]";
  if (status === "disputed") return "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]";
  if (status === "ai_reviewing") return "bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]";
  return "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]";
}

function issueTypeLabel(issue: QualityIssue) {
  if (isPrivacyIssue(issue)) return "未脱敏";
  if (isHistoryIssue(issue)) return "历史对比";
  if (isPageBoundaryIssue(issue)) return "页数边界";
  return "疑似缺字";
}

function issueTypeTone(issue: QualityIssue) {
  if (isPrivacyIssue(issue)) return "border-[#fecdd3] bg-[#fff1f2] text-[#dc2626]";
  if (isHistoryIssue(issue)) return "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]";
  if (isPageBoundaryIssue(issue)) return "border-[#fed7aa] bg-[#fff7ed] text-[#ea580c]";
  return "border-[#ddd6fe] bg-[#f5f3ff] text-[#7c3aed]";
}

function isPrivacyIssue(issue: QualityIssue) {
  return issue.category === "privacy" || issue.findingType === "privacy_leak" || /脱敏|身份证|手机号|敏感/.test(`${issue.issueType} ${issue.evidence}`);
}

function isPageBoundaryIssue(issue: QualityIssue) {
  return issue.category === "format" || issue.findingType === "format" || /页数|断页|边界|裁切|方向/.test(`${issue.issueType} ${issue.evidence}`);
}

function isHistoryIssue(issue: QualityIssue) {
  return issue.category === "history" || issue.findingType === "history_gap" || /历史|对比|前次/.test(`${issue.issueType} ${issue.evidence}`);
}

function evidenceLabelForIssue(issue: QualityIssue) {
  if (issue.findingType === "data_error" || /结构化|异常项|数据错误|边界值|数值/.test(`${issue.issueType} ${issue.evidence}`)) return "数据错误";
  if (isPrivacyIssue(issue)) return "未脱敏";
  if (isPageBoundaryIssue(issue)) return "页数边界";
  if (isHistoryIssue(issue)) return "历史对比";
  return "疑似缺字";
}

function groupCleaningIssues(issues: QualityIssue[]) {
  const order = ["数据错误", "疑似缺字", "页数边界", "疑似未脱敏", "历史对比"];
  const groups = new Map<string, QualityIssue[]>();
  issues.forEach((issue) => {
    const label = isPrivacyIssue(issue) ? "疑似未脱敏" : evidenceLabelForIssue(issue);
    groups.set(label, [...(groups.get(label) ?? []), issue]);
  });
  return order.filter((label) => groups.has(label)).map((label) => ({ label, heading: label === "疑似未脱敏" ? "疑似未脱敏" : label, issues: groups.get(label) ?? [] }));
}

function previewPageCountForIssue(issue: QualityIssue) {
  return issue.previewImageUrls?.length || issue.previewPageCount || Math.max(pageNumberFromIssue(issue), 1);
}

function pageNumberFromIssue(issue: QualityIssue) {
  if (issue.page === "图片" || issue.page === "Excel") return 1;
  const parsed = Number.parseInt(issue.page, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function previewImageForPage(issue: QualityIssue, page: number) {
  if (issue.previewImageUrls?.length) return issue.previewImageUrls[Math.max(0, Math.min(issue.previewImageUrls.length - 1, page - 1))];
  return issue.previewImageUrl || undefined;
}

function metricValue(metrics: QualityMetric[], label: string) {
  return metrics.find((metric) => metric.label === label)?.value;
}

function metricsFromIssues(baseMetrics: QualityMetric[], issues: QualityIssue[]) {
  const metricMap = new Map(baseMetrics.map((metric) => [metric.label, { ...metric }]));
  const issueCount = String(issues.length);
  const reviewCount = String(issues.filter((issue) => issue.status === "needs_review").length);
  metricMap.set("问题", { label: "问题", value: issueCount, icon: "warning", color: "orange" });
  metricMap.set("待复核", { label: "待复核", value: reviewCount, icon: "review", color: "red" });
  return ["年龄段", "PDF", "Excel", "问题", "待复核"].map((label) => metricMap.get(label)).filter(Boolean) as QualityMetric[];
}

function selectPrimaryImportedIssue(issues: QualityIssue[]) {
  return (
    issues.find((issue) => issue.findingType === "data_error") ??
    issues.find((issue) => issue.findingType === "missing_text") ??
    issues.find((issue) => issue.findingType === "privacy_leak") ??
    issues.find((issue) => issue.category === "content" && issue.ruleId !== "R-OCR-001") ??
    issues.find((issue) => issue.category === "privacy") ??
    issues.find((issue) => issue.ruleId === "R-VISION-001") ??
    issues.find((issue) => issue.ruleId !== "R-OCR-001") ??
    issues[0]
  );
}

function mapBackendIssue(issue: BackendQualityIssue, taskId: string): QualityIssue {
  const fileName = issue.file_name;
  const previewImageUrl = issue.preview_image_url ?? (isImageFile(fileName) ? `/api/quality/import/${taskId}/files/${encodeURIComponent(fileName)}` : undefined);
  return {
    id: issue.id,
    index: issue.index,
    fileName,
    group: issue.group ?? "",
    archiveId: issue.archive_id ?? fileName.replace(/\.[^.]+$/, ""),
    page: issue.page,
    issueType: issue.issue_type,
    category: issue.category,
    severity: issue.severity,
    ruleId: issue.rule_id,
    evidence: issue.evidence,
    aiJudgement: issue.ai_judgement,
    recommendation: issue.recommendation,
    confidence: issue.confidence,
    status: issue.status,
    foundAt: issue.found_at,
    previewUrl: issue.preview_url,
    previewType: issue.preview_type,
    previewImageUrl,
    previewImageUrls: issue.preview_image_urls,
    previewPageCount: issue.preview_page_count,
    findingType: issue.finding_type,
    bbox: issue.bbox,
  };
}

function isImageFile(fileName: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(fileName);
}

function uniqueFileButtonNames(issues: QualityIssue[]) {
  const counts = new Map<string, number>();
  const seen = new Map<string, number>();
  issues.forEach((issue) => counts.set(issue.fileName, (counts.get(issue.fileName) ?? 0) + 1));
  const names = new Map<string, string>();
  issues.forEach((issue) => {
    const next = (seen.get(issue.fileName) ?? 0) + 1;
    seen.set(issue.fileName, next);
    names.set(issue.id, (counts.get(issue.fileName) ?? 0) > 1 ? `${issue.fileName} (${next})` : issue.fileName);
  });
  return names;
}

function formatScannedAt(value: string) {
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (isoMatch) return `${isoMatch[1]} ${isoMatch[2]}`;
  return value.replace("T", " ").replace(/\.\d+Z?$/, "");
}

function exportDescriptionFor(item: string) {
  if (item === "第三批数据检测报告") return "PDF，总结方法、风险分布和检测结论。";
  if (item === "不合规问题清单") return "Excel，已确认问题、证据摘要和规则 ID。";
  if (item === "可能合规清单") return "人工驳回、低风险样本和可复查记录。";
  if (item === "人工复核记录") return "确认、驳回、争议、备注和复核人。";
  return "文件、页码、框选位置和截图索引。";
}