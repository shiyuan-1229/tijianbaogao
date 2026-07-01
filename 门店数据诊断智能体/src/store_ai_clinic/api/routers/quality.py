from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from store_ai_clinic.config import settings
from store_ai_clinic.schemas.quality import (
    QualityActionRecord,
    QualityActionRequest,
    QualityAssetSummary,
    QualityDatasetScan,
    QualityExportRequest,
    QualityExportSummary,
    QualityExportTask,
    QualityImportedFile,
    QualityImportScanTask,
    QualityImportTask,
    QualityIssue,
    QualityIssuesResponse,
    QualityReviewRecord,
    QualityReviewRequest,
    QualityRulesResponse,
)
from store_ai_clinic.services.quality_assets import extract_quality_asset_summary
from store_ai_clinic.services.quality_rules import extract_quality_rule_set
from store_ai_clinic.services.quality import (
    build_quality_export_summary,
    create_export_task,
    list_export_tasks,
    list_quality_actions,
    list_quality_issues,
    list_review_records,
    record_quality_action,
    record_review_decision,
    scan_quality_dataset,
)


router = APIRouter(prefix="/api/quality", tags=["quality"])


@router.post("/import", response_model=QualityImportTask, status_code=201)
async def import_quality_files(files: list[UploadFile] = File(...)) -> QualityImportTask:
    if not files:
        raise HTTPException(status_code=400, detail="Attach at least one file in the multipart form data.")

    task_id = f"quality-import-{uuid4().hex[:12]}"
    dataset_dir = _quality_import_dir(task_id)
    dataset_dir.mkdir(parents=True, exist_ok=False)

    imported_files: list[QualityImportedFile] = []
    total_bytes = 0
    try:
        for index, upload in enumerate(files, start=1):
            target = _unique_target_path(dataset_dir, _safe_upload_name(upload.filename, index))
            content = await upload.read()
            target.write_bytes(content)
            size = len(content)
            total_bytes += size
            imported_files.append(
                QualityImportedFile(
                    field_name="files",
                    name=target.name,
                    size=size,
                    type=upload.content_type or "application/octet-stream",
                    saved_path=str(target),
                )
            )
    finally:
        for upload in files:
            await upload.close()

    return QualityImportTask(
        task_id=task_id,
        dataset_path=str(dataset_dir),
        total_bytes=total_bytes,
        total_files=len(imported_files),
        files=imported_files,
        note="Files were persisted for quality scanning.",
    )


@router.post("/imports/{task_id}/scan", response_model=QualityImportScanTask)
def scan_imported_quality_dataset(task_id: str) -> QualityImportScanTask:
    dataset_dir = _quality_import_dir(task_id)
    if not dataset_dir.exists() or not dataset_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Quality import task not found: {task_id}")

    scan = QualityDatasetScan.model_validate(scan_quality_dataset(dataset_dir))
    return QualityImportScanTask(
        task_id=task_id,
        dataset_path=str(dataset_dir),
        status="done",
        message="Quality scan completed.",
        scan=scan,
    )




@router.get("/pdf-pages/{file_name}")
def get_quality_pdf_page_preview(file_name: str) -> FileResponse:
    file_path = _quality_pdf_page_path(file_name)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Quality PDF page preview not found: {file_name}")

    return FileResponse(file_path, filename=file_path.name)
@router.get("/imports/{task_id}/files/{file_name}")
def get_imported_quality_file(task_id: str, file_name: str) -> FileResponse:
    dataset_dir = _quality_import_dir(task_id)
    if not dataset_dir.exists() or not dataset_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Quality import task not found: {task_id}")

    file_path = _unique_import_file_path(dataset_dir, file_name)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Quality import file not found: {file_name}")

    return FileResponse(file_path, filename=file_path.name)


@router.get("/assets", response_model=QualityAssetSummary)
def get_quality_assets(dataset_path: str = Query(..., min_length=1)) -> QualityAssetSummary:
    asset_summary = extract_quality_asset_summary(dataset_path)
    return QualityAssetSummary.model_validate(asset_summary)

@router.get("/rules", response_model=QualityRulesResponse)
def get_quality_rules(dataset_path: str = Query(..., min_length=1)) -> QualityRulesResponse:
    rule_set = extract_quality_rule_set(dataset_path)
    return QualityRulesResponse.model_validate(rule_set)

@router.get("/datasets/scan", response_model=QualityDatasetScan)
def scan_dataset(dataset_path: str = Query(..., min_length=1)) -> QualityDatasetScan:
    try:
        return QualityDatasetScan.model_validate(scan_quality_dataset(dataset_path))
    except (FileNotFoundError, NotADirectoryError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/issues", response_model=QualityIssuesResponse)
def get_quality_issues(
    dataset_path: str = Query(..., min_length=1),
    category: str = "all",
    severity: str = "all",
    status: str = "all",
    query: str = "",
) -> QualityIssuesResponse:
    try:
        issues = list_quality_issues(
            dataset_path,
            category=category,
            severity=severity,
            status=status,
            query=query,
        )
    except (FileNotFoundError, NotADirectoryError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return QualityIssuesResponse(
        total=len(issues),
        issues=[QualityIssue.model_validate(issue) for issue in issues],
    )




@router.get("/actions", response_model=list[QualityActionRecord])
def get_quality_actions(dataset_path: str | None = None) -> list[QualityActionRecord]:
    return [QualityActionRecord.model_validate(record) for record in list_quality_actions(dataset_path=dataset_path)]


@router.post("/actions", response_model=QualityActionRecord, status_code=201)
def create_quality_action(request: QualityActionRequest) -> QualityActionRecord:
    return QualityActionRecord.model_validate(
        record_quality_action(
            action=request.action,
            label=request.label,
            page=request.page,
            target=request.target,
            actor=request.actor,
            dataset_path=request.dataset_path,
            payload=request.payload,
        )
    )

@router.get("/reviews", response_model=list[QualityReviewRecord])
def get_quality_reviews(dataset_path: str | None = None) -> list[QualityReviewRecord]:
    return [QualityReviewRecord.model_validate(record) for record in list_review_records(dataset_path=dataset_path)]


@router.post("/reviews", response_model=QualityReviewRecord)
def create_quality_review(request: QualityReviewRequest) -> QualityReviewRecord:
    return QualityReviewRecord.model_validate(
        record_review_decision(
            issue_id=request.issue_id,
            decision=request.decision,
            reviewer=request.reviewer,
            note=request.note,
            evidence=request.evidence,
            dataset_path=request.dataset_path,
        )
    )


@router.get("/exports", response_model=list[QualityExportTask])
def get_quality_exports(dataset_path: str | None = None) -> list[QualityExportTask]:
    return [QualityExportTask.model_validate(task) for task in list_export_tasks(dataset_path=dataset_path)]


@router.get("/exports/summary", response_model=QualityExportSummary)
def get_quality_export_summary(dataset_path: str = Query(..., min_length=1)) -> QualityExportSummary:
    try:
        return QualityExportSummary.model_validate(build_quality_export_summary(dataset_path))
    except (FileNotFoundError, NotADirectoryError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/exports/{task_id}/download")
def download_quality_export(task_id: str) -> FileResponse:
    task = next((item for item in list_export_tasks() if item.id == task_id), None)
    if task is None or not task.bundle_path:
        raise HTTPException(status_code=404, detail=f"Quality export bundle not found: {task_id}")

    bundle_path = Path(task.bundle_path)
    if not bundle_path.exists() or not bundle_path.is_file():
        raise HTTPException(status_code=404, detail=f"Quality export bundle not found: {task_id}")

    return FileResponse(bundle_path, filename=task.bundle_name or bundle_path.name, media_type="application/zip")


@router.post("/exports", response_model=QualityExportTask)
def create_quality_export(request: QualityExportRequest) -> QualityExportTask:
    try:
        return QualityExportTask.model_validate(
            create_export_task(
                request.export_type,
                dataset_path=request.dataset_path,
                selected_sections=request.selected_sections,
            )
        )
    except (FileNotFoundError, NotADirectoryError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _quality_pdf_page_path(file_name: str) -> Path:
    safe_name = Path(file_name).name.strip()
    if not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=404, detail=f"Quality PDF page preview not found: {file_name}")
    return Path(settings.local_storage_root) / "quality" / "pdf-pages" / safe_name
def _quality_import_dir(task_id: str) -> Path:
    return Path(settings.local_storage_root) / "quality" / "imports" / _safe_task_id(task_id)




def _unique_import_file_path(directory: Path, file_name: str) -> Path:
    safe_name = Path(file_name).name.strip()
    if not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=404, detail=f"Quality import file not found: {file_name}")
    return directory / safe_name


def _safe_task_id(task_id: str) -> str:
    return "".join(char if char.isalnum() or char in "-_" else "-" for char in task_id).strip("-_") or "quality-import"


def _safe_upload_name(file_name: str | None, index: int) -> str:
    name = Path(file_name or f"upload-{index}.bin").name.strip()
    if not name or name in {".", ".."}:
        return f"upload-{index}.bin"
    return name


def _unique_target_path(directory: Path, file_name: str) -> Path:
    target = directory / file_name
    if not target.exists():
        return target

    stem = target.stem
    suffix = target.suffix
    counter = 2
    while True:
        candidate = directory / f"{stem}-{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1













