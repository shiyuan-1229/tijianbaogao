from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re

from store_ai_clinic.services.quality import _collect_dataset_files, _coerce_datetime, _read_first_worksheet_rows


@dataclass(frozen=True)
class QualityArchiveAsset:
    group: str
    archive_id: str
    pdf_files: list[str]
    excel_files: list[str]
    visit_count: int
    has_pdf: bool
    has_excel: bool
    meets_three_visits: bool
    missing_items: list[str]


@dataclass(frozen=True)
class QualityAssetSummary:
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


def extract_quality_asset_summary(
    dataset_path: str | Path,
    now: str | datetime | None = None,
) -> QualityAssetSummary:
    root = Path(dataset_path)
    if not root.exists():
        raise FileNotFoundError(f"Dataset path does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Dataset path is not a directory: {root}")

    timestamp = _coerce_datetime(now) if now is not None else datetime.now(timezone.utc)
    files = _collect_dataset_files(root)
    pdf_files = [file for file in files if file.extension == ".pdf"]
    excel_files = [file for file in files if file.extension == ".xlsx"]
    groups = sorted({file.group for file in files if file.group})

    pdf_archive_files: dict[tuple[str, str], list[str]] = {}
    excel_archive_files: dict[tuple[str, str], set[str]] = {}
    archive_visit_dates: dict[tuple[str, str], set[str]] = {}

    for pdf_file in pdf_files:
        key = (pdf_file.group, _infer_archive_id(pdf_file.name))
        pdf_archive_files.setdefault(key, []).append(pdf_file.name)

    for excel_file in excel_files:
        rows = _read_first_worksheet_rows(excel_file.path)
        headers = rows[0] if rows else []
        archive_index = headers.index("ArchivesNum") if "ArchivesNum" in headers else -1
        date_index = headers.index("CheckDate") if "CheckDate" in headers else -1
        if archive_index < 0:
            continue
        for row in rows[1:]:
            archive_id = _normalize_archive_id(_row_value(row, archive_index))
            if not archive_id:
                continue
            key = (excel_file.group, archive_id)
            excel_archive_files.setdefault(key, set()).add(excel_file.name)
            check_date = _row_value(row, date_index)
            if check_date:
                archive_visit_dates.setdefault(key, set()).add(check_date)

    asset_keys = sorted(set(pdf_archive_files) | set(excel_archive_files))
    assets: list[QualityArchiveAsset] = []
    for group, archive_id in asset_keys:
        pdf_names = sorted(pdf_archive_files.get((group, archive_id), []))
        excel_names = sorted(excel_archive_files.get((group, archive_id), set()))
        visit_dates = archive_visit_dates.get((group, archive_id), set())
        visit_count = len(visit_dates) if visit_dates else len(pdf_names)
        has_pdf = bool(pdf_names)
        has_excel = bool(excel_names)
        meets_three_visits = visit_count >= 3
        missing_items: list[str] = []
        if not has_pdf:
            missing_items.append("missing_pdf")
        if not has_excel:
            missing_items.append("missing_excel")
        if not meets_three_visits:
            missing_items.append("under_three_visits")
        assets.append(
            QualityArchiveAsset(
                group=group,
                archive_id=archive_id,
                pdf_files=pdf_names,
                excel_files=excel_names,
                visit_count=visit_count,
                has_pdf=has_pdf,
                has_excel=has_excel,
                meets_three_visits=meets_three_visits,
                missing_items=missing_items,
            )
        )

    return QualityAssetSummary(
        dataset_path=str(root),
        scanned_at=timestamp.isoformat(),
        total_groups=len(groups),
        total_archives=len(assets),
        total_pdf_files=len(pdf_files),
        total_excel_files=len(excel_files),
        matched_archives=sum(1 for asset in assets if asset.has_pdf and asset.has_excel),
        missing_pdf_archives=sum(1 for asset in assets if not asset.has_pdf),
        missing_excel_archives=sum(1 for asset in assets if not asset.has_excel),
        under_three_visit_archives=sum(1 for asset in assets if not asset.meets_three_visits),
        assets=assets,
    )


def _infer_archive_id(file_name: str) -> str:
    stem = Path(file_name).stem
    digit_match = re.search(r"\d{6,}", stem)
    if digit_match:
        return digit_match.group(0)
    return _normalize_archive_id(stem)


def _normalize_archive_id(value: str) -> str:
    return value.strip()


def _row_value(row: list[str], index: int) -> str:
    return row[index].strip() if 0 <= index < len(row) and row[index] else ""
