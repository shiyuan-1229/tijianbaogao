from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import re
from typing import Literal
from uuid import uuid4
from zipfile import ZipFile

from store_ai_clinic.config import settings
from store_ai_clinic.services.quality_pdf_render import ChromePdfPageRenderer, PdfRenderError
from store_ai_clinic.services.quality_vision import QualityVisionAnalyzer, VisionModelError, VisionQualityFinding


IssueCategory = Literal["privacy", "content", "format", "history"]
IssueSeverity = Literal["high", "medium", "low"]
FindingType = Literal["data_error", "missing_text", "privacy_leak", "history_gap", "format", "other"]
ReviewStatus = Literal["needs_review", "ai_reviewing", "confirmed", "rejected"]
ReviewDecision = Literal["confirmed", "rejected", "disputed"]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

REQUIRED_EXCEL_COLUMNS = [
    "ArchivesNum",
    "DepartmentName",
    "ItemGroupName",
    "ItemFlag",
    "ItemResultNum",
    "ItemResultChar",
    "Symbol",
    "stand",
    "CheckDate",
]

ABNORMAL_TEXT_RE = re.compile(r"异常|阳性|偏高|偏低|结节|囊肿|增厚|↑|↓")


@dataclass(frozen=True)
class QualityMetric:
    label: str
    value: str
    icon: str | None = None
    color: str | None = None


@dataclass(frozen=True)
class QualityPipelineStage:
    label: str
    value: str
    done: bool
    active: bool


@dataclass(frozen=True)
class QualityIssue:
    id: str
    index: int
    file_name: str
    group: str
    archive_id: str
    page: str
    issue_type: str
    category: IssueCategory
    severity: IssueSeverity
    rule_id: str
    evidence: str
    ai_judgement: str
    recommendation: str
    confidence: float
    status: ReviewStatus
    found_at: str
    finding_type: FindingType | None = None
    bbox: list[float] | None = None
    preview_image_url: str | None = None
    preview_image_urls: list[str] | None = None
    preview_page_count: int | None = None


@dataclass(frozen=True)
class QualityDatasetScan:
    dataset_path: str
    scanned_at: str
    metrics: list[QualityMetric]
    pipeline: list[QualityPipelineStage]
    issues: list[QualityIssue]


@dataclass(frozen=True)
class QualityReviewRecord:
    id: str
    issue_id: str
    decision: ReviewDecision
    reviewer: str
    note: str
    evidence: str
    created_at: str
    dataset_path: str | None = None


@dataclass(frozen=True)
class QualityExportTask:
    id: str
    export_type: str
    dataset_path: str
    status: Literal["queued", "running", "done", "failed"]
    message: str
    created_at: str
    bundle_name: str | None = None
    bundle_path: str | None = None
    download_url: str | None = None
    artifact_count: int | None = None


@dataclass(frozen=True)
class QualityExportSection:
    key: str
    title: str
    item_count: int
    description: str


@dataclass(frozen=True)
class QualityExportRuleHit:
    rule_id: str
    rule_name: str | None = None
    hit_count: int = 0


@dataclass(frozen=True)
class QualityExportSummary:
    dataset_path: str
    generated_at: str
    total_issues: int
    confirmed_issues: int
    rejected_issues: int
    pending_issues: int
    review_record_count: int
    evidence_image_count: int
    sections: list[QualityExportSection]
    rule_hits: list[QualityExportRuleHit]


@dataclass(frozen=True)
class DatasetFile:
    path: Path
    name: str
    extension: str
    group: str


_REVIEW_RECORDS: list[QualityReviewRecord] = []
_EXPORT_TASKS: list[QualityExportTask] = []


def scan_quality_dataset(
    dataset_path: str | Path,
    now: str | datetime | None = None,
    vision_analyzer: object | None = None,
    pdf_page_renderer: object | None = None,
) -> QualityDatasetScan:
    root = Path(dataset_path)
    if not root.exists():
        raise FileNotFoundError(f"Dataset path does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Dataset path is not a directory: {root}")

    timestamp = _coerce_datetime(now)
    scanned_at = timestamp.isoformat()
    found_at = _format_datetime(timestamp)
    files = _collect_dataset_files(root)
    groups = {file.group for file in files if file.group}
    pdf_files = [file for file in files if file.extension == ".pdf"]
    image_files = [file for file in files if file.extension in IMAGE_EXTENSIONS]
    xlsx_files = [file for file in files if file.extension == ".xlsx"]
    issues: list[QualityIssue] = []
    resolved_vision_analyzer = vision_analyzer if vision_analyzer is not None else _default_vision_analyzer()
    resolved_pdf_page_renderer = pdf_page_renderer if pdf_page_renderer is not None else _default_pdf_page_renderer()

    for pdf_file in pdf_files:
        rendered_pages = _render_pdf_pages_safely(resolved_pdf_page_renderer, pdf_file.path)
        rendered_page = rendered_pages[0] if rendered_pages else None
        preview_image_urls = _pdf_page_preview_urls(rendered_pages)
        preview_image_url = preview_image_urls[0] if preview_image_urls else None
        preview_page_count = len(preview_image_urls) if preview_image_urls else None
        page_count = _read_pdf_page_count(pdf_file.path)
        if 0 < page_count < 5:
            issues.append(
                _create_issue(
                    file=pdf_file,
                    index=len(issues) + 1,
                    rule_id="R-FORMAT-002",
                    issue_type="页数边界",
                    category="format",
                    severity="high",
                    page="1",
                    evidence=f"PDF 页数为 {page_count}，低于第一阶段 5-10 页或 10+ 页分布要求。",
                    ai_judgement="格式质量异常",
                    recommendation="保留 PDF 页数证据，进入人工复核确认是否为缺页或样本边界。",
                    confidence=0.9,
                    found_at=found_at,
                    preview_image_url=preview_image_url,
                    preview_image_urls=preview_image_urls,
                    preview_page_count=preview_page_count,
                )
            )

        vision_findings = _analyze_pdf_pages_safely(resolved_vision_analyzer, rendered_pages)
        if vision_findings:
            for page_number, vision_finding in vision_findings:
                page_preview_image_url = preview_image_urls[page_number - 1] if page_number <= len(preview_image_urls) else preview_image_url
                issues.append(
                    _create_issue(
                        file=pdf_file,
                        index=len(issues) + 1,
                        rule_id="R-VISION-001",
                        issue_type=vision_finding.issue_type,
                        category=_category_for_vision_finding(vision_finding),
                        severity=vision_finding.severity,
                        page=str(page_number),
                        evidence=vision_finding.evidence,
                        ai_judgement=vision_finding.ai_judgement,
                        recommendation=vision_finding.recommendation,
                        confidence=vision_finding.confidence,
                        found_at=found_at,
                        finding_type=vision_finding.finding_type,
                        bbox=vision_finding.bbox,
                        preview_image_url=page_preview_image_url,
                        preview_image_urls=preview_image_urls,
                        preview_page_count=preview_page_count,
                    )
                )
            continue

        issues.append(
            _create_issue(
                file=pdf_file,
                index=len(issues) + 1,
                rule_id="R-OCR-001",
                issue_type="OCR 待处理",
                category="content",
                severity="medium",
                page="1" if page_count > 0 else "-",
                evidence="已保留 PDF 文件、页数和路径证据，等待 OCR 或视觉模型生成页面级文字证据。",
                ai_judgement="需要补充 OCR 证据",
                recommendation="不猜测 PDF 文字内容，接入 OCR/视觉模型后再生成内容级判断。",
                confidence=0.7,
                found_at=found_at,
                preview_image_url=preview_image_url,
                preview_image_urls=preview_image_urls,
                preview_page_count=preview_page_count,
            )
        )

    for image_file in image_files:
        vision_finding = _analyze_image_safely(resolved_vision_analyzer, image_file.path)
        if vision_finding is not None:
            issues.append(
                _create_issue(
                    file=image_file,
                    index=len(issues) + 1,
                    rule_id="R-VISION-001",
                    issue_type=vision_finding.issue_type,
                    category=_category_for_vision_finding(vision_finding),
                    severity=vision_finding.severity,
                    page="图片",
                    evidence=vision_finding.evidence,
                    ai_judgement=vision_finding.ai_judgement,
                    recommendation=vision_finding.recommendation,
                    confidence=vision_finding.confidence,
                    found_at=found_at,
                    finding_type=vision_finding.finding_type,
                    bbox=vision_finding.bbox,
                )
            )
            continue

        issues.append(
            _create_issue(
                file=image_file,
                index=len(issues) + 1,
                rule_id="R-IMAGE-001",
                issue_type="图片待 OCR",
                category="content",
                severity="medium",
                page="图片",
                evidence=f"已导入图片文件 {image_file.name}，等待 OCR 或视觉模型生成文字证据。",
                ai_judgement="需补充 OCR 证据",
                recommendation="先展示原始图片供人工复核，后续接入 OCR/视觉模型后再生成内容级判断。",
                confidence=0.72,
                found_at=found_at,
            )
        )
    for xlsx_file in xlsx_files:
        rows = _read_first_worksheet_rows(xlsx_file.path)
        headers = rows[0] if rows else []
        missing_columns = [column for column in REQUIRED_EXCEL_COLUMNS if column not in headers]
        if missing_columns:
            issues.append(
                _create_issue(
                    file=xlsx_file,
                    index=len(issues) + 1,
                    rule_id="R-EXCEL-001",
                    issue_type="字段缺失",
                    category="content",
                    severity="high",
                    page="Excel",
                    evidence="结构化数据缺少字段：" + "、".join(missing_columns) + "。",
                    ai_judgement="结构化字段不完整",
                    recommendation="保留字段清单证据，进入人工复核，不补写缺失字段。",
                    confidence=0.95,
                    found_at=found_at,
                )
            )

        issues.extend(_excel_abnormal_issues(xlsx_file, rows, headers, len(issues), found_at))

    return QualityDatasetScan(
        dataset_path=str(root),
        scanned_at=scanned_at,
        metrics=[
            QualityMetric("年龄段", str(len(groups)), "people", "teal"),
            QualityMetric("PDF", str(len(pdf_files)), "pdf", "blue"),
            QualityMetric("Excel", str(len(xlsx_files)), "excel", "green"),
            QualityMetric("问题", str(len(issues)), "warning", "orange"),
            QualityMetric("待复核", str(sum(1 for issue in issues if issue.status == "needs_review")), "review", "red"),
        ],
        pipeline=[
            QualityPipelineStage("文件扫描", f"{len(files)}/{len(files)}", True, False),
            QualityPipelineStage("Excel 解析", f"{len(xlsx_files)}/{len(xlsx_files)}", True, False),
            QualityPipelineStage("PDF 页数", f"{len(pdf_files)}/{len(pdf_files)}", True, False),
            QualityPipelineStage("OCR 证据", f"0/{len(pdf_files)}", False, len(pdf_files) > 0),
            QualityPipelineStage("人工复核", "待开始" if issues else "无待复核", not issues, False),
        ],
        issues=issues,
    )


def _default_vision_analyzer() -> QualityVisionAnalyzer | None:
    if not settings.openai_api_key:
        return None
    return QualityVisionAnalyzer.from_settings()



def _default_pdf_page_renderer() -> ChromePdfPageRenderer:
    return ChromePdfPageRenderer()


def _render_pdf_pages_safely(pdf_page_renderer: object | None, pdf_path: Path) -> list[Path]:
    if pdf_page_renderer is None:
        return []
    render_pages = getattr(pdf_page_renderer, "render_pages", None)
    try:
        if callable(render_pages):
            return [Path(path) for path in render_pages(pdf_path)]
        render_first_page = getattr(pdf_page_renderer, "render_first_page", None)
        if callable(render_first_page):
            return [Path(render_first_page(pdf_path))]
    except (PdfRenderError, OSError):
        return []
    return []

def _analyze_pdf_safely(
    analyzer: object | None,
    pdf_page_renderer: object | None,
    pdf_path: Path,
) -> tuple[VisionQualityFinding, Path] | None:
    if analyzer is None or pdf_page_renderer is None:
        return None
    render_first_page = getattr(pdf_page_renderer, "render_first_page", None)
    if not callable(render_first_page):
        return None
    try:
        rendered_page = render_first_page(pdf_path)
    except (PdfRenderError, OSError):
        return None
    finding = _analyze_image_safely(analyzer, Path(rendered_page))
    if finding is None:
        return None
    return finding, Path(rendered_page)

def _pdf_page_preview_urls(rendered_pages: list[Path]) -> list[str]:
    return [f"/api/quality/pdf-pages/{rendered_page.name}" for rendered_page in rendered_pages]

def _pdf_page_preview_url(rendered_page: Path) -> str:
    return f"/api/quality/pdf-pages/{rendered_page.name}"

def _analyze_pdf_pages_safely(analyzer: object | None, rendered_pages: list[Path]) -> list[tuple[int, VisionQualityFinding]]:
    if analyzer is None:
        return []
    analyze_images = getattr(analyzer, "analyze_images", None)
    if callable(analyze_images):
        try:
            findings = analyze_images(rendered_pages)
        except VisionModelError:
            findings = []
        if isinstance(findings, list):
            return [
                (page_number, finding)
                for page_number, finding in findings
                if isinstance(page_number, int)
                and 1 <= page_number <= len(rendered_pages)
                and isinstance(finding, VisionQualityFinding)
                and finding.has_finding
            ]

    findings: list[tuple[int, VisionQualityFinding]] = []
    for page_number, rendered_page in enumerate(rendered_pages, start=1):
        finding = _analyze_image_safely(analyzer, rendered_page)
        if finding is not None and finding.has_finding:
            findings.append((page_number, finding))
    return findings

def _analyze_image_safely(analyzer: object | None, image_path: Path) -> VisionQualityFinding | None:
    if analyzer is None:
        return None
    analyze = getattr(analyzer, "analyze_image", None)
    if not callable(analyze):
        return None
    try:
        finding = analyze(image_path)
    except VisionModelError:
        return None
    if isinstance(finding, VisionQualityFinding):
        return finding
    return None

def list_quality_issues(
    dataset_path: str | Path,
    *,
    category: str = "all",
    severity: str = "all",
    status: str = "all",
    query: str = "",
) -> list[QualityIssue]:
    scan = scan_quality_dataset(dataset_path)
    normalized_query = query.strip().lower()
    issues = scan.issues
    if category != "all":
        issues = [issue for issue in issues if issue.category == category]
    if severity != "all":
        issues = [issue for issue in issues if issue.severity == severity]
    if status != "all":
        issues = [issue for issue in issues if issue.status == status]
    if normalized_query:
        issues = [
            issue
            for issue in issues
            if normalized_query
            in " ".join([issue.file_name, issue.issue_type, issue.evidence, issue.rule_id]).lower()
        ]
    return issues


def record_review_decision(
    *,
    issue_id: str,
    decision: ReviewDecision,
    reviewer: str,
    note: str,
    evidence: str,
    dataset_path: str | Path | None = None,
    storage_root: str | Path | None = None,
    now: str | datetime | None = None,
) -> QualityReviewRecord:
    record = QualityReviewRecord(
        id=f"review-{uuid4().hex[:12]}",
        issue_id=issue_id,
        decision=decision,
        reviewer=reviewer.strip(),
        note=note.strip(),
        evidence=evidence.strip(),
        created_at=_coerce_datetime(now).isoformat(),
        dataset_path=str(Path(dataset_path)) if dataset_path is not None else None,
    )
    _REVIEW_RECORDS.append(record)
    _append_jsonl(_review_records_path(storage_root), asdict(record))
    return record


def create_export_task(
    export_type: str,
    *,
    dataset_path: str | Path,
    storage_root: str | Path | None = None,
    now: str | datetime | None = None,
    selected_sections: list[str] | None = None,
) -> QualityExportTask:
    from store_ai_clinic.services.quality_assets import extract_quality_asset_summary

    root = Path(dataset_path)
    if not root.exists():
        raise FileNotFoundError(f"Dataset path does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Dataset path is not a directory: {root}")

    timestamp = _coerce_datetime(now)
    task_id = f"export-{uuid4().hex[:12]}"
    summary = build_quality_export_summary(root, now=timestamp, storage_root=storage_root)
    asset_summary = extract_quality_asset_summary(root, now=timestamp)
    issues = list_quality_issues(root)
    review_records = list_review_records(dataset_path=root, storage_root=storage_root)
    review_status_by_issue = _latest_review_status_by_issue(review_records)
    confirmed_issues, rejected_issues, pending_issues = _split_export_issues(issues, review_status_by_issue)
    section_keys = _normalize_export_section_keys(selected_sections)
    export_dir = _quality_export_dir(storage_root, task_id)
    export_dir.mkdir(parents=True, exist_ok=True)
    artifact_count = 0

    if "third-batch-report" in section_keys:
        _write_text(
            export_dir / "third-batch-report.md",
            _build_quality_export_report(
                summary=summary,
                asset_summary=asset_summary,
                confirmed_issues=confirmed_issues,
                rejected_issues=rejected_issues,
                pending_issues=pending_issues,
                review_records=review_records,
            ),
        )
        artifact_count += 1
    if "non-compliant" in section_keys:
        _write_jsonl_records(export_dir / "non-compliant-issues.jsonl", [_issue_export_payload(issue, "confirmed") for issue in confirmed_issues])
        artifact_count += 1
    if "possible-compliant" in section_keys:
        _write_jsonl_records(export_dir / "possible-compliant-issues.jsonl", [_issue_export_payload(issue, "rejected") for issue in rejected_issues])
        artifact_count += 1
    if "needs-review" in section_keys:
        _write_jsonl_records(export_dir / "needs-review-issues.jsonl", [_issue_export_payload(issue, "needs_review") for issue in pending_issues])
        artifact_count += 1
    if "review-records" in section_keys:
        _write_jsonl_records(export_dir / "review-records.jsonl", [asdict(record) for record in review_records])
        artifact_count += 1
    if "rule-hit-stats" in section_keys:
        _write_json(export_dir / "rule-hit-stats.json", {"dataset_path": summary.dataset_path, "generated_at": summary.generated_at, "rule_hits": [asdict(rule_hit) for rule_hit in summary.rule_hits]})
        artifact_count += 1
    if "evidence-image-index" in section_keys:
        _write_json(export_dir / "evidence-image-index.json", {"dataset_path": summary.dataset_path, "evidence_images": _build_evidence_image_index(issues, review_status_by_issue)})
        artifact_count += 1
    if "export-summary" in section_keys:
        _write_json(export_dir / "export-summary.json", asdict(summary))
        artifact_count += 1

    bundle_name = f"quality-export-{task_id}.zip"
    bundle_path = export_dir / bundle_name
    _zip_export_dir(export_dir, bundle_path)

    task = QualityExportTask(
        id=task_id,
        export_type=export_type.strip(),
        dataset_path=str(root),
        status="done",
        message=f"已生成交付包：{bundle_name}，包含 {artifact_count} 个文件。",
        created_at=timestamp.isoformat(),
        bundle_name=bundle_name,
        bundle_path=str(bundle_path),
        download_url=f"/api/quality/exports/{task_id}/download",
        artifact_count=artifact_count,
    )
    _EXPORT_TASKS.append(task)
    _append_jsonl(_export_tasks_path(storage_root), asdict(task))
    return task


def build_quality_export_summary(
    dataset_path: str | Path,
    *,
    now: str | datetime | None = None,
    storage_root: str | Path | None = None,
) -> QualityExportSummary:
    from store_ai_clinic.services.quality_assets import extract_quality_asset_summary
    from store_ai_clinic.services.quality_rules import extract_quality_rule_set

    root = Path(dataset_path)
    timestamp = _coerce_datetime(now)
    asset_summary = extract_quality_asset_summary(root, now=timestamp)
    rule_set = extract_quality_rule_set(root)
    issues = list_quality_issues(root)
    review_records = list_review_records(dataset_path=root, storage_root=storage_root)
    review_status_by_issue = _latest_review_status_by_issue(review_records)

    confirmed_issues = 0
    rejected_issues = 0
    pending_issues = 0
    for issue in issues:
        resolved_status = review_status_by_issue.get(issue.id, issue.status)
        if resolved_status == "confirmed":
            confirmed_issues += 1
        elif resolved_status == "rejected":
            rejected_issues += 1
        else:
            pending_issues += 1

    rule_name_by_id = {rule.rule_id: rule.rule_name for rule in rule_set.rules}
    hit_counts = Counter(issue.rule_id for issue in issues)
    rule_hits = [
        QualityExportRuleHit(
            rule_id=rule_id,
            rule_name=rule_name_by_id.get(rule_id),
            hit_count=hit_counts[rule_id],
        )
        for rule_id in sorted(hit_counts)
    ]
    evidence_image_count = _unique_evidence_image_count(issues)

    sections = [
        QualityExportSection(
            key="third-batch-report",
            title="第三批数据检测报告",
            item_count=asset_summary.total_archives,
            description=(
                f"覆盖 {asset_summary.total_groups} 个年龄段、"
                f"{asset_summary.total_archives} 份档案、{len(issues)} 个问题。"
            ),
        ),
        QualityExportSection(
            key="non-compliant",
            title="不合规问题清单",
            item_count=confirmed_issues,
            description="人工已确认的问题，适合进入不合规导出清单。",
        ),
        QualityExportSection(
            key="possible-compliant",
            title="可能合规清单",
            item_count=rejected_issues,
            description="人工已驳回的问题，保留为可能合规样本。",
        ),
        QualityExportSection(
            key="needs-review",
            title="需人工复核清单",
            item_count=pending_issues,
            description="仍待人工确认或存在争议的问题。",
        ),
        QualityExportSection(
            key="review-records",
            title="人工复核记录",
            item_count=len(review_records),
            description="真实人工复核动作与备注记录。",
        ),
        QualityExportSection(
            key="rule-hit-stats",
            title="规则命中统计",
            item_count=len(rule_hits),
            description="按规则 ID 汇总当前数据集的命中次数。",
        ),
    ]

    return QualityExportSummary(
        dataset_path=str(root),
        generated_at=timestamp.isoformat(),
        total_issues=len(issues),
        confirmed_issues=confirmed_issues,
        rejected_issues=rejected_issues,
        pending_issues=pending_issues,
        review_record_count=len(review_records),
        evidence_image_count=evidence_image_count,
        sections=sections,
        rule_hits=rule_hits,
    )

EXPORT_SECTION_ALIASES: dict[str, list[str]] = {
    "third-batch-report": ["third-batch-report"],
    "第三批数据检测报告": ["third-batch-report"],
    "non-compliant": ["non-compliant"],
    "不合规问题清单": ["non-compliant"],
    "possible-compliant": ["possible-compliant"],
    "可能合规清单": ["possible-compliant"],
    "review-records": ["review-records"],
    "人工复核记录": ["review-records"],
    "evidence-image-index": ["evidence-image-index"],
    "证据截图索引": ["evidence-image-index"],
    "needs-review": ["needs-review"],
    "需人工复核清单": ["needs-review"],
    "rule-hit-stats": ["rule-hit-stats"],
    "规则命中统计": ["rule-hit-stats"],
    "export-summary": ["export-summary"],
}

DEFAULT_EXPORT_SECTION_KEYS = {
    "third-batch-report",
    "non-compliant",
    "possible-compliant",
    "needs-review",
    "review-records",
    "rule-hit-stats",
    "evidence-image-index",
    "export-summary",
}


def _normalize_export_section_keys(selected_sections: list[str] | None) -> set[str]:
    if not selected_sections:
        return set(DEFAULT_EXPORT_SECTION_KEYS)

    resolved: set[str] = set()
    for value in selected_sections:
        normalized = value.strip()
        if not normalized:
            continue
        aliases = EXPORT_SECTION_ALIASES.get(normalized)
        if aliases:
            resolved.update(aliases)
        else:
            resolved.add(normalized)

    resolved.update({"needs-review", "rule-hit-stats", "export-summary"})
    return resolved or set(DEFAULT_EXPORT_SECTION_KEYS)


def _split_export_issues(
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> tuple[list[QualityIssue], list[QualityIssue], list[QualityIssue]]:
    confirmed: list[QualityIssue] = []
    rejected: list[QualityIssue] = []
    pending: list[QualityIssue] = []
    for issue in issues:
        resolved_status = review_status_by_issue.get(issue.id, issue.status)
        if resolved_status == "confirmed":
            confirmed.append(issue)
        elif resolved_status == "rejected":
            rejected.append(issue)
        else:
            pending.append(issue)
    return confirmed, rejected, pending


def _issue_export_payload(
    issue: QualityIssue,
    resolved_status: ReviewStatus | Literal["disputed"],
) -> dict[str, object]:
    payload = asdict(issue)
    payload["status"] = resolved_status
    return payload


def _build_evidence_image_index(
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for issue in issues:
        if not issue.preview_image_url and not issue.preview_image_urls:
            continue
        items.append(
            {
                "issue_id": issue.id,
                "file_name": issue.file_name,
                "page": issue.page,
                "rule_id": issue.rule_id,
                "issue_type": issue.issue_type,
                "status": review_status_by_issue.get(issue.id, issue.status),
                "preview_image_url": issue.preview_image_url,
                "preview_image_urls": issue.preview_image_urls,
                "preview_page_count": issue.preview_page_count,
                "finding_type": issue.finding_type,
                "bbox": issue.bbox,
            }
        )
    return items


def _build_quality_export_report(
    *,
    summary: QualityExportSummary,
    asset_summary: object,
    confirmed_issues: list[QualityIssue],
    rejected_issues: list[QualityIssue],
    pending_issues: list[QualityIssue],
    review_records: list[QualityReviewRecord],
) -> str:
    lines = [
        "# 第三批数据检测报告",
        "",
        f"- 生成时间：{summary.generated_at}",
        f"- 数据集：{summary.dataset_path}",
        f"- 年龄段数量：{asset_summary.total_groups}",
        f"- 档案数量：{asset_summary.total_archives}",
        f"- PDF 数量：{asset_summary.total_pdf_files}",
        f"- Excel 数量：{asset_summary.total_excel_files}",
        "",
        "## 问题概览",
        f"- 总问题：{summary.total_issues}",
        f"- 已确认：{len(confirmed_issues)}",
        f"- 已驳回：{len(rejected_issues)}",
        f"- 待复核：{len(pending_issues)}",
        f"- 复核记录：{len(review_records)}",
        f"- 证据截图：{summary.evidence_image_count}",
    ]
    if summary.rule_hits:
        lines.extend(["", "## 规则命中统计"])
        for rule_hit in summary.rule_hits:
            rule_label = rule_hit.rule_name or rule_hit.rule_id
            lines.append(f"- {rule_label}（{rule_hit.rule_id}）：{rule_hit.hit_count}")
    lines.extend([
        "",
        "## 导出说明",
        "- 本报告只汇总当前数据集、规则命中和人工复核记录。",
        "- 不自动修复 PDF，不补写缺失字段，不伪造合规结论。",
    ])
    return "\n".join(lines)


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_jsonl_records(path: Path, records: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def _zip_export_dir(export_dir: Path, bundle_path: Path) -> None:
    with ZipFile(bundle_path, "w") as archive:
        for file_path in sorted(export_dir.iterdir()):
            if file_path == bundle_path or not file_path.is_file():
                continue
            archive.write(file_path, arcname=file_path.name)
def list_review_records(
    *,
    dataset_path: str | Path | None = None,
    storage_root: str | Path | None = None,
) -> list[QualityReviewRecord]:
    records = _read_jsonl(_review_records_path(storage_root))
    if records:
        result = [QualityReviewRecord(**record) for record in records]
    else:
        result = list(_REVIEW_RECORDS)
    if dataset_path is not None:
        expected = str(Path(dataset_path))
        result = [record for record in result if record.dataset_path == expected]
    return result


def list_export_tasks(
    *,
    dataset_path: str | Path | None = None,
    storage_root: str | Path | None = None,
) -> list[QualityExportTask]:
    tasks = _read_jsonl(_export_tasks_path(storage_root))
    if tasks:
        result = [QualityExportTask(**task) for task in tasks]
    else:
        result = list(_EXPORT_TASKS)
    if dataset_path is not None:
        expected = str(Path(dataset_path))
        result = [task for task in result if task.dataset_path == expected]
    return result


def _latest_review_status_by_issue(review_records: list[QualityReviewRecord]) -> dict[str, ReviewStatus | Literal["disputed"]]:
    latest: dict[str, ReviewStatus | Literal["disputed"]] = {}
    for record in sorted(review_records, key=lambda item: _coerce_datetime(item.created_at)):
        latest[record.issue_id] = _review_status_from_decision(record.decision)
    return latest



def _review_status_from_decision(decision: ReviewDecision) -> ReviewStatus | Literal["disputed"]:
    if decision == "confirmed":
        return "confirmed"
    if decision == "rejected":
        return "rejected"
    return "disputed"



def _unique_evidence_image_count(issues: list[QualityIssue]) -> int:
    preview_urls: set[str] = set()
    for issue in issues:
        if issue.preview_image_urls:
            preview_urls.update(issue.preview_image_urls)
        elif issue.preview_image_url:
            preview_urls.add(issue.preview_image_url)
    return len(preview_urls)
def _quality_state_dir(storage_root: str | Path | None) -> Path:
    return Path(storage_root or settings.local_storage_root) / "quality"


def _quality_export_dir(storage_root: str | Path | None, task_id: str) -> Path:
    return _quality_state_dir(storage_root) / "exports" / task_id

def _review_records_path(storage_root: str | Path | None) -> Path:
    return _quality_state_dir(storage_root) / "review-records.jsonl"


def _export_tasks_path(storage_root: str | Path | None) -> Path:
    return _quality_state_dir(storage_root) / "export-tasks.jsonl"


def _append_jsonl(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


def _read_jsonl(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    records: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def _collect_dataset_files(root: Path) -> list[DatasetFile]:
    files: list[DatasetFile] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or _is_ignored(path.relative_to(root)):
            continue
        group = "" if path.parent == root else path.parent.name
        files.append(DatasetFile(path=path, name=path.name, extension=path.suffix.lower(), group=group))
    return files


def _is_ignored(path: Path) -> bool:
    return any(part.startswith(".") or part.startswith("._") for part in path.parts)


def _read_pdf_page_count(path: Path) -> int:
    try:
        text = path.read_bytes().decode("latin1", errors="ignore")
    except OSError:
        return 0
    return len(re.findall(r"/Type\s*/Page\b", text))


def _read_first_worksheet_rows(path: Path) -> list[list[str]]:
    try:
        with ZipFile(path) as archive:
            shared_xml = _read_zip_text(archive, "xl/sharedStrings.xml")
            sheet_xml = _read_zip_text(archive, "xl/worksheets/sheet1.xml")
    except (OSError, KeyError):
        return []
    shared_strings = _parse_shared_strings(shared_xml)
    return _parse_sheet_rows(sheet_xml, shared_strings)


def _read_zip_text(archive: ZipFile, name: str) -> str:
    try:
        return archive.read(name).decode("utf-8", errors="ignore")
    except KeyError:
        return ""


def _parse_shared_strings(xml: str) -> list[str]:
    strings: list[str] = []
    for match in re.finditer(r"<si[^>]*>(.*?)</si>", xml, re.S):
        text_parts = re.findall(r"<t[^>]*>(.*?)</t>", match.group(1), re.S)
        strings.append(_decode_xml("".join(text_parts)))
    return strings


def _parse_sheet_rows(xml: str, shared_strings: list[str]) -> list[list[str]]:
    rows: list[list[str]] = []
    for row_match in re.finditer(r"<row[^>]*>(.*?)</row>", xml, re.S):
        cells: list[str] = []
        for cell_match in re.finditer(r"<c([^>]*)>(.*?)</c>", row_match.group(1), re.S):
            attrs = cell_match.group(1)
            body = cell_match.group(2)
            column_name = re.search(r'r="([A-Z]+)\d+"', attrs)
            column_index = _column_index(column_name.group(1) if column_name else "A")
            raw_value = _extract_cell_value(body)
            value = shared_strings[int(raw_value)] if 't="s"' in attrs and raw_value.isdigit() and int(raw_value) < len(shared_strings) else _decode_xml(raw_value)
            while len(cells) <= column_index:
                cells.append("")
            cells[column_index] = value
        rows.append(cells)
    return rows


def _extract_cell_value(body: str) -> str:
    value = re.search(r"<v>(.*?)</v>", body, re.S)
    if value:
        return value.group(1)
    inline = re.search(r"<t[^>]*>(.*?)</t>", body, re.S)
    return inline.group(1) if inline else ""


def _column_index(column: str) -> int:
    value = 0
    for char in column:
        value = value * 26 + ord(char) - 64
    return value - 1


def _excel_abnormal_issues(
    file: DatasetFile,
    rows: list[list[str]],
    headers: list[str],
    existing_count: int,
    found_at: str,
) -> list[QualityIssue]:
    def index_of(column: str) -> int:
        return headers.index(column) if column in headers else -1

    symbol_index = index_of("Symbol")
    item_flag_index = index_of("ItemFlag")
    result_char_index = index_of("ItemResultChar")
    archive_index = index_of("ArchivesNum")
    if symbol_index < 0 and result_char_index < 0:
        return []

    issues: list[QualityIssue] = []
    for row in rows[1:]:
        symbol = _row_value(row, symbol_index)
        result_char = _row_value(row, result_char_index)
        if not symbol.strip() and not ABNORMAL_TEXT_RE.search(result_char):
            continue
        archive_id = _row_value(row, archive_index) or _archive_id_from_file(file.name)
        item_flag = _row_value(row, item_flag_index) or "未知项目"
        issues.append(
            _create_issue(
                file=file,
                index=existing_count + len(issues) + 1,
                rule_id="R-EXCEL-002",
                issue_type="结构化异常项",
                category="content",
                severity="medium",
                page="Excel",
                archive_id=archive_id,
                evidence=(
                    f"结构化数据 {archive_id} 的 {item_flag} 命中异常标记："
                    f"Symbol={symbol or '空'}，ItemResultChar={result_char or '空'}。"
                ),
                ai_judgement="Excel 字段提示异常",
                recommendation="关联对应 PDF 页面和 OCR 证据后进入人工复核。",
                confidence=0.86,
                found_at=found_at,
            )
        )
    return issues


def _row_value(row: list[str], index: int) -> str:
    return row[index] if 0 <= index < len(row) else ""


def _create_issue(
    *,
    file: DatasetFile,
    index: int,
    rule_id: str,
    issue_type: str,
    category: IssueCategory,
    severity: IssueSeverity,
    page: str,
    evidence: str,
    ai_judgement: str,
    recommendation: str,
    confidence: float,
    found_at: str,
    archive_id: str | None = None,
    finding_type: FindingType | None = None,
    bbox: list[float] | None = None,
    preview_image_url: str | None = None,
    preview_image_urls: list[str] | None = None,
    preview_page_count: int | None = None,
) -> QualityIssue:
    resolved_archive_id = archive_id or _archive_id_from_file(file.name)
    return QualityIssue(
        id=f"{rule_id.lower()}-{index}-{resolved_archive_id}",
        index=index,
        file_name=file.name,
        group=file.group,
        archive_id=resolved_archive_id,
        page=page,
        issue_type=issue_type,
        category=category,
        severity=severity,
        rule_id=rule_id,
        evidence=evidence,
        ai_judgement=ai_judgement,
        recommendation=recommendation,
        confidence=confidence,
        status="needs_review",
        found_at=found_at,
        finding_type=finding_type,
        bbox=bbox,
        preview_image_url=preview_image_url,
        preview_image_urls=preview_image_urls,
        preview_page_count=preview_page_count,
    )


def _category_for_vision_finding(finding: VisionQualityFinding) -> IssueCategory:
    if finding.finding_type == "privacy_leak":
        return "privacy"
    if finding.finding_type == "history_gap":
        return "history"
    if finding.finding_type == "format":
        return "format"
    return "content"

def _archive_id_from_file(file_name: str) -> str:
    return Path(file_name).stem


def _coerce_datetime(value: str | datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _format_datetime(value: datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S")


def _decode_xml(value: str) -> str:
    return (
        value.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )






















