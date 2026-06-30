from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
IssueCategory = Literal["privacy", "content", "format", "history"]
IssueSeverity = Literal["high", "medium", "low"]
ReviewStatus = Literal["needs_review", "ai_reviewing", "confirmed", "rejected"]
FindingType = Literal["data_error", "missing_text", "privacy_leak", "history_gap", "format", "other"]
ReviewDecision = Literal["confirmed", "rejected", "disputed"]



class QualityRule(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_name: str
    source: str
    dimension: str
    check_target: str
    pass_condition: str
    fail_condition: str
    severity: str
    detect_method: str
    need_human_review: bool


class QualityRulesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dataset_path: str
    source_document: str | None
    rules: list[QualityRule]


class QualityArchiveAsset(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    group: str
    archive_id: str
    pdf_files: list[str]
    excel_files: list[str]
    visit_count: int
    has_pdf: bool
    has_excel: bool
    meets_three_visits: bool
    missing_items: list[str]


class QualityAssetSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dataset_path: str
    scanned_at: str
    total_groups: int
    total_archives: int
    total_pdf_files: int
    total_excel_files: int
    matched_archives: int
    missing_pdf_archives: int
    missing_excel_archives: int
    under_three_visit_archives: int
    assets: list[QualityArchiveAsset]

class QualityMetric(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    value: str
    icon: str | None = None
    color: str | None = None


class QualityPipelineStage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    value: str
    done: bool
    active: bool


class QualityIssue(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class QualityDatasetScan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dataset_path: str
    scanned_at: str
    metrics: list[QualityMetric]
    pipeline: list[QualityPipelineStage]
    issues: list[QualityIssue]


class QualityIssuesResponse(BaseModel):
    total: int
    issues: list[QualityIssue]


class QualityReviewRequest(BaseModel):
    issue_id: NonEmptyString
    decision: ReviewDecision
    reviewer: NonEmptyString
    note: NonEmptyString
    evidence: NonEmptyString
    dataset_path: str | None = None


class QualityReviewRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue_id: str
    decision: ReviewDecision
    reviewer: str
    note: str
    evidence: str
    created_at: str
    dataset_path: str | None = None


class QualityExportRequest(BaseModel):
    export_type: NonEmptyString
    dataset_path: NonEmptyString
    selected_sections: list[NonEmptyString] = []


class QualityExportTask(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class QualityExportSection(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    title: str
    item_count: int
    description: str


class QualityExportRuleHit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_name: str | None = None
    hit_count: int


class QualityExportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class QualityImportedFile(BaseModel):
    field_name: str
    name: str
    size: int
    type: str
    saved_path: str


class QualityImportTask(BaseModel):
    data_source: Literal["backend"] = "backend"
    persisted: Literal[True] = True
    task_id: str
    dataset_path: str
    total_bytes: int
    total_files: int
    files: list[QualityImportedFile]
    note: str


class QualityImportScanTask(BaseModel):
    task_id: str
    dataset_path: str
    status: Literal["done"]
    message: str
    scan: QualityDatasetScan











