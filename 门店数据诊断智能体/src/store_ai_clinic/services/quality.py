from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
import html
import json
import re
import shutil
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
class QualityActionRecord:
    id: str
    action: str
    label: str
    page: str
    target: str | None
    actor: str
    message: str
    created_at: str
    dataset_path: str | None = None
    payload: dict[str, object] | None = None

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
    export_dir: str | None = None


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
_ACTION_RECORDS: list[QualityActionRecord] = []


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


class _NoopPdfPageRenderer:
    def render_pages(self, pdf_path: Path) -> list[Path]:
        return []


class _NoopVisionAnalyzer:
    def analyze_image(self, image_path: Path) -> None:
        return None

    def analyze_images(self, image_paths: list[Path]) -> list[object]:
        return []


def _scan_quality_dataset_for_export(dataset_path: Path, timestamp: datetime) -> QualityDatasetScan:
    return scan_quality_dataset(
        dataset_path,
        now=timestamp,
        vision_analyzer=_NoopVisionAnalyzer(),
        pdf_page_renderer=_NoopPdfPageRenderer(),
    )

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
    export_scan = _scan_quality_dataset_for_export(root, timestamp)
    issues = export_scan.issues
    summary = build_quality_export_summary(root, now=timestamp, storage_root=storage_root, issues=issues)
    asset_summary = extract_quality_asset_summary(root, now=timestamp)
    review_records = list_review_records(dataset_path=root, storage_root=storage_root)
    review_status_by_issue = _latest_review_status_by_issue(review_records)
    confirmed_issues, rejected_issues, pending_issues = _split_export_issues(issues, review_status_by_issue)
    section_keys = _normalize_export_section_keys(selected_sections)
    export_dir = _quality_export_dir(storage_root, task_id, root, timestamp)
    export_dir.mkdir(parents=True, exist_ok=True)
    artifact_count = 0

    _write_customer_package_index(
        export_dir,
        summary=summary,
        asset_summary=asset_summary,
        confirmed_issues=confirmed_issues,
        rejected_issues=rejected_issues,
        pending_issues=pending_issues,
        timestamp=timestamp,
    )
    artifact_count += 1
    _write_customer_batch_report_html(
        export_dir,
        summary=summary,
        asset_summary=asset_summary,
        confirmed_issues=confirmed_issues,
        rejected_issues=rejected_issues,
        pending_issues=pending_issues,
        review_records=review_records,
    )
    artifact_count += 1

    if "third-batch-report" in section_keys:
        _write_text(
            _export_section_file(export_dir, "third-batch-report", "third-batch-report.md"),
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
        _write_jsonl_records(
            _export_section_file(export_dir, "non-compliant", "non-compliant-issues.jsonl"),
            [_issue_export_payload(issue, "confirmed") for issue in confirmed_issues],
        )
        artifact_count += 1
    if "possible-compliant" in section_keys:
        _write_jsonl_records(
            _export_section_file(export_dir, "possible-compliant", "possible-compliant-issues.jsonl"),
            [_issue_export_payload(issue, "rejected") for issue in rejected_issues],
        )
        artifact_count += 1
    if "needs-review" in section_keys:
        _write_jsonl_records(
            _export_section_file(export_dir, "needs-review", "needs-review-issues.jsonl"),
            [_issue_export_payload(issue, "needs_review") for issue in pending_issues],
        )
        artifact_count += 1
    if "review-records" in section_keys:
        _write_jsonl_records(
            _export_section_file(export_dir, "review-records", "review-records.jsonl"),
            [asdict(record) for record in review_records],
        )
        artifact_count += 1
    if "rule-hit-stats" in section_keys:
        _write_json(
            _export_section_file(export_dir, "rule-hit-stats", "rule-hit-stats.json"),
            {"dataset_path": summary.dataset_path, "generated_at": summary.generated_at, "rule_hits": [asdict(rule_hit) for rule_hit in summary.rule_hits]},
        )
        artifact_count += 1
    if "evidence-image-index" in section_keys:
        _write_json(
            _export_section_file(export_dir, "evidence-image-index", "evidence-image-index.json"),
            {"dataset_path": summary.dataset_path, "evidence_images": _build_evidence_image_index(issues, review_status_by_issue)},
        )
        artifact_count += 1
    if "batch-overview-table" in section_keys:
        _write_batch_overview_xlsx(
            _export_section_file(export_dir, "batch-overview-table", "批次总体情况表.xlsx"),
            asset_summary,
            issues,
            review_status_by_issue,
        )
        artifact_count += 1
    if "structured-data" in section_keys:
        artifact_count += _export_structured_data_tables(_export_section_dir(export_dir, "structured-data"), root)
    if "compliant-pdfs" in section_keys:
        artifact_count += _export_compliant_pdfs(_export_section_dir(export_dir, "compliant-pdfs"), root, issues, review_status_by_issue)
    if "issue-detail-reports" in section_keys:
        detail_statuses = {"confirmed", "needs_review", "ai_reviewing", "disputed"}
        artifact_count += _export_issue_detail_reports(
            _export_section_dir(export_dir, "issue-detail-reports"),
            issues,
            review_status_by_issue,
            include_statuses=detail_statuses,
        )
        artifact_count += _export_customer_issue_detail_html(
            export_dir / "02-逐份报告问题说明",
            issues,
            review_status_by_issue,
            include_statuses=detail_statuses,
        )
    if "export-summary" in section_keys:
        _write_json(_export_section_file(export_dir, "export-summary", "export-summary.json"), asdict(summary))
        artifact_count += 1

    bundle_name = f"体检报告质检交付包_{_safe_filename_segment(root.name, '数据集')}_{timestamp.strftime('%Y%m%d_%H%M')}_{task_id.removeprefix('export-')}.zip"
    bundle_path = export_dir / bundle_name
    _zip_export_dir(export_dir, bundle_path)

    task = QualityExportTask(
        id=task_id,
        export_type=export_type.strip(),
        dataset_path=str(root),
        status="done",
        message=f"已生成交付包：{bundle_name}，包含 {artifact_count} 个文件。文件夹：{export_dir}",
        created_at=timestamp.isoformat(),
        bundle_name=bundle_name,
        bundle_path=str(bundle_path),
        download_url=f"/api/quality/exports/{task_id}/download",
        artifact_count=artifact_count,
        export_dir=str(export_dir),
    )
    _EXPORT_TASKS.append(task)
    _append_jsonl(_export_tasks_path(storage_root), asdict(task))
    return task


def build_quality_export_summary(
    dataset_path: str | Path,
    *,
    now: str | datetime | None = None,
    storage_root: str | Path | None = None,
    issues: list[QualityIssue] | None = None,
) -> QualityExportSummary:
    from store_ai_clinic.services.quality_assets import extract_quality_asset_summary
    from store_ai_clinic.services.quality_rules import extract_quality_rule_set

    root = Path(dataset_path)
    timestamp = _coerce_datetime(now)
    asset_summary = extract_quality_asset_summary(root, now=timestamp)
    rule_set = extract_quality_rule_set(root)
    resolved_issues = issues if issues is not None else list_quality_issues(root)
    review_records = list_review_records(dataset_path=root, storage_root=storage_root)
    review_status_by_issue = _latest_review_status_by_issue(review_records)

    confirmed_issues = 0
    rejected_issues = 0
    pending_issues = 0
    for issue in resolved_issues:
        resolved_status = review_status_by_issue.get(issue.id, issue.status)
        if resolved_status == "confirmed":
            confirmed_issues += 1
        elif resolved_status == "rejected":
            rejected_issues += 1
        else:
            pending_issues += 1

    rule_name_by_id = {rule.rule_id: rule.rule_name for rule in rule_set.rules}
    hit_counts = Counter(issue.rule_id for issue in resolved_issues)
    rule_hits = [
        QualityExportRuleHit(
            rule_id=rule_id,
            rule_name=rule_name_by_id.get(rule_id),
            hit_count=hit_counts[rule_id],
        )
        for rule_id in sorted(hit_counts)
    ]
    evidence_image_count = _unique_evidence_image_count(resolved_issues)

    sections = [
        QualityExportSection(
            key="third-batch-report",
            title="第三批数据检测报告",
            item_count=asset_summary.total_archives,
            description=(
                f"覆盖 {asset_summary.total_groups} 个年龄段、"
                f"{asset_summary.total_archives} 份档案、{len(resolved_issues)} 个问题。"
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
        QualityExportSection(
            key="batch-overview-table",
            title="批次总体情况表",
            item_count=asset_summary.total_archives,
            description="按档案汇总合规状态、问题数量和文件完整性，输出 Excel。",
        ),
        QualityExportSection(
            key="structured-data",
            title="结构化数据导出",
            item_count=asset_summary.total_archives,
            description="按档案导出与原始 Excel 相同字段结构的 .xlsx 文件。",
        ),
        QualityExportSection(
            key="compliant-pdfs",
            title="合格 PDF 文件夹",
            item_count=max(asset_summary.total_pdf_files - confirmed_issues, 0),
            description="合格PDF/ 子目录存放无问题的 PDF 文件。",
        ),
        QualityExportSection(
            key="issue-detail-reports",
            title="问题详情分析报告",
            item_count=confirmed_issues + pending_issues,
            description="为不合规与待复核报告生成逐份问题分析。",
        ),
    ]

    return QualityExportSummary(
        dataset_path=str(root),
        generated_at=timestamp.isoformat(),
        total_issues=len(resolved_issues),
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
    "batch-overview-table": ["batch-overview-table"],
    "批次总体情况表": ["batch-overview-table"],
    "structured-data": ["structured-data"],
    "结构化数据导出": ["structured-data"],
    "compliant-pdfs": ["compliant-pdfs"],
    "合格 PDF 文件夹": ["compliant-pdfs"],
    "issue-detail-reports": ["issue-detail-reports"],
    "问题详情分析报告": ["issue-detail-reports"],
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

EXPORT_SECTION_FOLDERS: dict[str, str] = {
    "third-batch-report": "检测报告",
    "non-compliant": "不合规问题清单",
    "possible-compliant": "可能合规清单",
    "needs-review": "待复核问题清单",
    "review-records": "人工复核记录",
    "rule-hit-stats": "规则命中统计",
    "evidence-image-index": "证据截图索引",
    "batch-overview-table": "批次总体情况表",
    "structured-data": "结构化数据",
    "compliant-pdfs": "合格PDF",
    "issue-detail-reports": "问题详情分析",
    "export-summary": "导出摘要",
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

    resolved.update({"export-summary"})
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


def _write_customer_package_index(
    export_dir: Path,
    *,
    summary: QualityExportSummary,
    asset_summary: object,
    confirmed_issues: list[QualityIssue],
    rejected_issues: list[QualityIssue],
    pending_issues: list[QualityIssue],
    timestamp: datetime,
) -> None:
    dataset_label = _safe_filename_segment(Path(summary.dataset_path).name, "数据集")
    body = f"""
    <section class="hero">
      <p class="eyebrow">体检报告质检交付包</p>
      <h1>{html.escape(dataset_label)} 客户交付说明</h1>
      <p>本交付包生成于 {html.escape(_format_datetime(timestamp))}，对应数据集：<strong>{html.escape(summary.dataset_path)}</strong></p>
    </section>
    <section class="metrics">
      {_metric_card("年龄段", asset_summary.total_groups)}
      {_metric_card("档案数", asset_summary.total_archives)}
      {_metric_card("PDF", asset_summary.total_pdf_files)}
      {_metric_card("Excel", asset_summary.total_excel_files)}
      {_metric_card("总问题", summary.total_issues)}
      {_metric_card("已确认不合规", len(confirmed_issues))}
      {_metric_card("可能合规", len(rejected_issues))}
      {_metric_card("待复核", len(pending_issues))}
    </section>
    <section>
      <h2>客户阅读顺序</h2>
      <ol class="steps">
        <li><a href="01-批次质检总报告.html">先看 01-批次质检总报告.html</a>：了解本批次整体结论、问题分布和高风险摘要。</li>
        <li><a href="02-逐份报告问题说明/">再看 02-逐份报告问题说明</a>：按报告文件逐份查看问题、页码、规则和处理建议。</li>
        <li>需要复核原始数据时，再打开 Excel、问题清单、合格 PDF 等附属文件夹。</li>
      </ol>
    </section>
    <section>
      <h2>交付包内容</h2>
      <table>
        <thead><tr><th>位置</th><th>用途</th></tr></thead>
        <tbody>
          <tr><td>01-批次质检总报告.html</td><td>客户阅读版总报告。</td></tr>
          <tr><td>02-逐份报告问题说明/</td><td>每一份问题报告的单独说明。</td></tr>
          <tr><td>批次总体情况表/</td><td>可筛选的 Excel 汇总表。</td></tr>
          <tr><td>问题详情分析报告/</td><td>原始 Markdown 明细，便于内部留档。</td></tr>
          <tr><td>export-summary.json</td><td>系统接口可读的摘要数据。</td></tr>
        </tbody>
      </table>
    </section>
    """
    _write_text(export_dir / "00-交付包说明.html", _html_page("交付包说明", body))


def _write_customer_batch_report_html(
    export_dir: Path,
    *,
    summary: QualityExportSummary,
    asset_summary: object,
    confirmed_issues: list[QualityIssue],
    rejected_issues: list[QualityIssue],
    pending_issues: list[QualityIssue],
    review_records: list[QualityReviewRecord],
) -> None:
    category_counts = Counter(issue.category for issue in confirmed_issues + rejected_issues + pending_issues)
    high_issues = [issue for issue in confirmed_issues + pending_issues if issue.severity == "high"]
    issue_rows = "".join(
        f"<tr><td>{html.escape(issue.file_name)}</td><td>{html.escape(issue.archive_id)}</td><td>{html.escape(issue.page)}</td><td>{html.escape(issue.rule_id)}</td><td>{html.escape(_severity_label(issue.severity))}</td><td>{html.escape(issue.evidence)}</td></tr>"
        for issue in (confirmed_issues + pending_issues)[:50]
    ) or "<tr><td colspan='6'>本批次暂无已确认或待复核问题。</td></tr>"
    rule_rows = "".join(
        f"<tr><td>{html.escape(rule.rule_id)}</td><td>{html.escape(rule.rule_name or rule.rule_id)}</td><td>{rule.hit_count}</td></tr>"
        for rule in summary.rule_hits
    ) or "<tr><td colspan='3'>暂无规则命中。</td></tr>"
    category_items = "".join(f"<li>{html.escape(_category_label(category))}：{count}</li>" for category, count in sorted(category_counts.items())) or "<li>暂无问题分类统计。</li>"
    high_items = "".join(f"<li><strong>{html.escape(issue.file_name)}</strong>：{html.escape(issue.evidence)}</li>" for issue in high_issues[:10]) or "<li>暂无高风险问题。</li>"
    body = f"""
    <section class="hero">
      <p class="eyebrow">客户阅读版</p>
      <h1>批次质检总报告</h1>
      <p>数据集：<strong>{html.escape(summary.dataset_path)}</strong></p>
    </section>
    <section class="metrics">
      {_metric_card("档案数", asset_summary.total_archives)}
      {_metric_card("PDF", asset_summary.total_pdf_files)}
      {_metric_card("Excel", asset_summary.total_excel_files)}
      {_metric_card("总问题", summary.total_issues)}
      {_metric_card("已确认不合规", summary.confirmed_issues)}
      {_metric_card("可能合规", summary.rejected_issues)}
      {_metric_card("待复核", summary.pending_issues)}
      {_metric_card("复核记录", len(review_records))}
    </section>
    <section>
      <h2>本批次结论</h2>
      <p>本报告用于说明当前数据集中体检报告的质检结果。已确认不合规和待复核项目需要客户重点查看；可能合规项目保留为复核参考。</p>
    </section>
    <section>
      <h2>问题分类统计</h2>
      <ul>{category_items}</ul>
    </section>
    <section>
      <h2>高风险问题摘要</h2>
      <ul>{high_items}</ul>
    </section>
    <section>
      <h2>不合规与待复核报告清单</h2>
      <table>
        <thead><tr><th>报告文件</th><th>档案号</th><th>页码</th><th>命中规则</th><th>严重程度</th><th>证据说明</th></tr></thead>
        <tbody>{issue_rows}</tbody>
      </table>
    </section>
    <section>
      <h2>规则命中统计</h2>
      <table><thead><tr><th>规则 ID</th><th>规则名称</th><th>命中次数</th></tr></thead><tbody>{rule_rows}</tbody></table>
    </section>
    """
    _write_text(export_dir / "01-批次质检总报告.html", _html_page("批次质检总报告", body))


def _export_customer_issue_detail_html(
    output_dir: Path,
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
    *,
    include_statuses: set[str],
) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, list[QualityIssue]] = {}
    for issue in issues:
        status = _resolved_issue_status(issue, review_status_by_issue)
        if status not in include_statuses:
            continue
        grouped.setdefault(issue.file_name, []).append(issue)

    count = 0
    for file_name, file_issues in sorted(grouped.items()):
        safe_name = _safe_filename_segment(Path(file_name).stem, "report")
        issue_sections = []
        for index, issue in enumerate(file_issues, start=1):
            status = _resolved_issue_status(issue, review_status_by_issue)
            issue_sections.append(
                f"""
                <article class="issue">
                  <h2>问题 {index}</h2>
                  <dl>
                    <dt>当前判定</dt><dd>{html.escape(_status_label(status))}</dd>
                    <dt>问题类型</dt><dd>{html.escape(issue.issue_type)}</dd>
                    <dt>严重程度</dt><dd>{html.escape(_severity_label(issue.severity))}</dd>
                    <dt>命中规则</dt><dd>{html.escape(issue.rule_id)}</dd>
                    <dt>页码/位置</dt><dd>{html.escape(issue.page)}</dd>
                    <dt>证据说明</dt><dd>{html.escape(issue.evidence)}</dd>
                    <dt>AI 判断</dt><dd>{html.escape(issue.ai_judgement)}</dd>
                    <dt>处理建议</dt><dd>{html.escape(issue.recommendation)}</dd>
                    <dt>置信度</dt><dd>{issue.confidence:.2f}</dd>
                  </dl>
                </article>
                """
            )
        body = f"""
        <section class="hero">
          <p class="eyebrow">逐份报告问题说明</p>
          <h1>{html.escape(file_name)}</h1>
          <p>档案号：{html.escape(file_issues[0].archive_id)}；年龄段：{html.escape(file_issues[0].group)}；问题数量：{len(file_issues)}</p>
        </section>
        {''.join(issue_sections)}
        """
        _write_text(output_dir / f"{safe_name}_问题说明.html", _html_page(f"{file_name} 问题说明", body))
        count += 1
    return count


def _html_page(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}</title>
  <style>
    body {{ margin: 0; background: #f5f7fb; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif; }}
    main {{ max-width: 1120px; margin: 0 auto; padding: 32px 24px 56px; }}
    .hero {{ background: #ffffff; border: 1px solid #d9e0e8; border-radius: 8px; padding: 24px; margin-bottom: 16px; }}
    .eyebrow {{ margin: 0 0 8px; color: #0b8b8b; font-weight: 700; font-size: 13px; }}
    h1 {{ margin: 0 0 12px; font-size: 28px; line-height: 1.25; }}
    h2 {{ margin: 0 0 12px; font-size: 18px; }}
    section, article.issue {{ background: #ffffff; border: 1px solid #d9e0e8; border-radius: 8px; padding: 20px; margin-top: 14px; }}
    .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; background: transparent; border: 0; padding: 0; }}
    .metric {{ background: #ffffff; border: 1px solid #d9e0e8; border-radius: 8px; padding: 16px; }}
    .metric span {{ display: block; color: #64748b; font-size: 13px; }}
    .metric strong {{ display: block; margin-top: 8px; font-size: 24px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
    th, td {{ border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; vertical-align: top; }}
    th {{ background: #f8fafc; color: #334155; }}
    a {{ color: #0b8b8b; font-weight: 700; }}
    .steps li {{ margin: 8px 0; }}
    dl {{ display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px 14px; margin: 0; }}
    dt {{ color: #64748b; font-weight: 700; }}
    dd {{ margin: 0; }}
  </style>
</head>
<body><main>{body}</main></body>
</html>"""


def _metric_card(label: str, value: object) -> str:
    return f"<div class='metric'><span>{html.escape(label)}</span><strong>{html.escape(str(value))}</strong></div>"


def _category_label(category: str) -> str:
    return {
        "privacy": "隐私脱敏",
        "content": "内容完整性",
        "format": "格式页数",
        "history": "历史对比",
    }.get(category, category)


def _severity_label(severity: str) -> str:
    return {"high": "高", "medium": "中", "low": "低"}.get(severity, severity)


def _status_label(status: str) -> str:
    return {
        "confirmed": "已确认不合规",
        "rejected": "可能合规",
        "needs_review": "待人工复核",
        "ai_reviewing": "AI 复核中",
        "disputed": "存在争议",
    }.get(status, status)

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
        for file_path in sorted(export_dir.rglob("*")):
            if file_path == bundle_path or file_path.is_dir():
                continue
            archive.write(file_path, arcname=file_path.relative_to(export_dir).as_posix())


def _resolved_issue_status(
    issue: QualityIssue,
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> ReviewStatus | Literal["disputed"]:
    return review_status_by_issue.get(issue.id, issue.status)


def _file_compliance_label(
    file_name: str,
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> str:
    file_issues = [issue for issue in issues if issue.file_name == file_name]
    if not file_issues:
        return "合格"
    if any(_resolved_issue_status(issue, review_status_by_issue) == "confirmed" for issue in file_issues):
        return "不合规"
    if any(_resolved_issue_status(issue, review_status_by_issue) in {"needs_review", "ai_reviewing", "disputed"} for issue in file_issues):
        return "待复核"
    return "合格"


def _write_xlsx_rows(path: Path, rows: list[list[str]]) -> None:
    from openpyxl import Workbook

    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Sheet1"
    for row in rows:
        worksheet.append(row)
    workbook.save(path)


def _write_batch_overview_xlsx(
    path: Path,
    asset_summary: object,
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> None:
    issues_by_archive: dict[tuple[str, str], list[QualityIssue]] = {}
    for issue in issues:
        key = (issue.group, issue.archive_id)
        issues_by_archive.setdefault(key, []).append(issue)

    rows: list[list[str]] = [[
        "年龄段",
        "档案号",
        "PDF文件数",
        "Excel文件数",
        "就诊次数",
        "问题数",
        "高严重度问题",
        "合规状态",
        "缺失项",
    ]]
    for asset in asset_summary.assets:
        archive_issues = issues_by_archive.get((asset.group, asset.archive_id), [])
        high_count = sum(1 for issue in archive_issues if issue.severity == "high")
        pdf_names = asset.pdf_files
        compliance = "合格"
        if any(_resolved_issue_status(issue, review_status_by_issue) == "confirmed" for issue in archive_issues):
            compliance = "不合规"
        elif any(_resolved_issue_status(issue, review_status_by_issue) in {"needs_review", "ai_reviewing", "disputed"} for issue in archive_issues):
            compliance = "待复核"
        elif archive_issues and all(_resolved_issue_status(issue, review_status_by_issue) == "rejected" for issue in archive_issues):
            compliance = "可能合规"
        missing_labels = {
            "missing_pdf": "缺 PDF",
            "missing_excel": "缺 Excel",
            "under_three_visits": "少于 3 次就诊",
        }
        rows.append([
            asset.group,
            asset.archive_id,
            str(len(pdf_names)),
            str(len(asset.excel_files)),
            str(asset.visit_count),
            str(len(archive_issues)),
            str(high_count),
            compliance,
            "、".join(missing_labels.get(item, item) for item in asset.missing_items) if asset.missing_items else "",
        ])
    _write_xlsx_rows(path, rows)


def _export_structured_data_tables(output_dir: Path, root: Path) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    grouped_rows: dict[str, list[list[str]]] = {}
    count = 0
    for dataset_file in _collect_dataset_files(root):
        if dataset_file.extension != ".xlsx":
            continue
        rows = _read_first_worksheet_rows(dataset_file.path)
        if not rows:
            continue
        headers = rows[0]
        archive_index = headers.index("ArchivesNum") if "ArchivesNum" in headers else -1
        if archive_index < 0:
            continue
        for row in rows[1:]:
            archive_id = row[archive_index].strip() if archive_index < len(row) else ""
            if not archive_id:
                continue
            key = f"{dataset_file.group}_{archive_id}" if dataset_file.group else archive_id
            if key not in grouped_rows:
                grouped_rows[key] = [headers]
            grouped_rows[key].append(row)
    for key, rows in sorted(grouped_rows.items()):
        safe_name = _safe_filename_segment(key, "archive")
        _write_xlsx_rows(output_dir / f"{safe_name}.xlsx", rows)
        count += 1
    return count


def _export_compliant_pdfs(
    output_dir: Path,
    root: Path,
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    file_map = {dataset_file.name: dataset_file.path for dataset_file in _collect_dataset_files(root) if dataset_file.extension == ".pdf"}
    copied = 0
    for file_name, source_path in sorted(file_map.items()):
        if _file_compliance_label(file_name, issues, review_status_by_issue) != "合格":
            continue
        target = output_dir / file_name
        shutil.copy2(source_path, target)
        copied += 1
    return copied


def _export_issue_detail_reports(
    output_dir: Path,
    issues: list[QualityIssue],
    review_status_by_issue: dict[str, ReviewStatus | Literal["disputed"]],
    *,
    include_statuses: set[str],
) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, list[QualityIssue]] = {}
    for issue in issues:
        status = _resolved_issue_status(issue, review_status_by_issue)
        if status not in include_statuses:
            continue
        grouped.setdefault(issue.file_name, []).append(issue)

    count = 0
    for file_name, file_issues in sorted(grouped.items()):
        safe_name = _safe_filename_segment(Path(file_name).stem, "report")
        lines = [
            f"# {file_name} 问题详情分析",
            "",
            f"- 问题数量：{len(file_issues)}",
            "",
        ]
        for index, issue in enumerate(file_issues, start=1):
            status = _resolved_issue_status(issue, review_status_by_issue)
            lines.extend([
                f"## 问题 {index}",
                f"- 状态：{status}",
                f"- 类型：{issue.issue_type}",
                f"- 严重程度：{issue.severity}",
                f"- 规则：{issue.rule_id}",
                f"- 页码：{issue.page}",
                f"- 证据：{issue.evidence}",
                f"- AI 判断：{issue.ai_judgement}",
                f"- 处理建议：{issue.recommendation}",
                f"- 置信度：{issue.confidence}",
                "",
            ])
        _write_text(output_dir / f"{safe_name}.md", "\n".join(lines))
        count += 1
    return count


def record_quality_action(
    *,
    action: str,
    label: str,
    page: str,
    target: str | None = None,
    actor: str = "operator",
    dataset_path: str | Path | None = None,
    payload: dict[str, object] | None = None,
    storage_root: str | Path | None = None,
    now: str | datetime | None = None,
) -> QualityActionRecord:
    timestamp = _coerce_datetime(now)
    record = QualityActionRecord(
        id=f"quality-action-{uuid4().hex[:12]}",
        action=action.strip(),
        label=label.strip(),
        page=page.strip(),
        target=target.strip() if isinstance(target, str) and target.strip() else None,
        actor=actor.strip() or "operator",
        message=f"已记录操作：{label.strip()}",
        created_at=timestamp.isoformat(),
        dataset_path=str(Path(dataset_path)) if dataset_path else None,
        payload=payload or {},
    )
    _ACTION_RECORDS.append(record)
    _append_jsonl(_action_records_path(storage_root), asdict(record))
    return record


def list_quality_actions(
    *,
    dataset_path: str | Path | None = None,
    storage_root: str | Path | None = None,
) -> list[QualityActionRecord]:
    records = _read_jsonl(_action_records_path(storage_root))
    if records:
        result = [QualityActionRecord(**record) for record in records]
    else:
        result = list(_ACTION_RECORDS)
    if dataset_path is not None:
        expected = str(Path(dataset_path))
        result = [record for record in result if record.dataset_path == expected]
    return result

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


def _quality_deliverables_root(storage_root: str | Path | None) -> Path:
    storage = Path(storage_root or settings.local_storage_root).resolve()
    deliverables_name = settings.quality_deliverables_root.strip() or "质检交付"
    if storage.name == "data":
        return storage.parent / deliverables_name
    return storage / deliverables_name


def _safe_filename_segment(value: str, fallback: str) -> str:
    normalized = re.sub(r'[<>:"/\\|?*\s]+', "_", value).strip("._")
    return normalized or fallback

def _quality_export_dir(
    storage_root: str | Path | None,
    task_id: str,
    dataset_path: Path,
    timestamp: datetime,
) -> Path:
    dataset_label = _safe_filename_segment(dataset_path.name or "dataset", "dataset")
    stamp = timestamp.strftime("%Y%m%d_%H%M%S")
    short_id = task_id.removeprefix("export-")
    return _quality_deliverables_root(storage_root) / f"{dataset_label}_{stamp}_{short_id}"


def _export_section_dir(export_dir: Path, section_key: str) -> Path:
    folder_name = EXPORT_SECTION_FOLDERS.get(section_key, section_key)
    target_dir = export_dir / folder_name
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def _export_section_file(export_dir: Path, section_key: str, file_name: str) -> Path:
    return _export_section_dir(export_dir, section_key) / file_name

def _action_records_path(storage_root: str | Path | None) -> Path:
    return _quality_state_dir(storage_root) / "action-records.jsonl"

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






















