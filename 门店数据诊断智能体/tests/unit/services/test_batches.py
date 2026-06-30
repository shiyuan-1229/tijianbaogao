from pathlib import Path

import pytest

from store_ai_clinic.services.batches import ParsedFileName, parse_file_name, split_batch_files
from store_ai_clinic.services.storage import build_batch_archive_path


def test_split_batch_files_groups_by_store():
    files = [
        "acme_SH001_20260609_daily.xlsx",
        "acme_SH001_20260609_weekly.xlsx",
        "acme_SH002_20260609_daily.xlsx",
    ]

    grouped = split_batch_files("acme", files)

    assert grouped["SH001"] == [
        "acme_SH001_20260609_daily.xlsx",
        "acme_SH001_20260609_weekly.xlsx",
    ]
    assert grouped["SH002"] == ["acme_SH002_20260609_daily.xlsx"]


def test_parse_file_name_returns_named_parts_for_supported_pattern():
    parsed = parse_file_name("acme_SH001_20260609_daily.xlsx")

    assert parsed == ParsedFileName(
        brand="acme",
        store="SH001",
        biz_date="20260609",
        report_type="daily",
    )


def test_parse_file_name_rejects_invalid_report_type():
    with pytest.raises(
        ValueError,
        match=r"Invalid file name: acme_SH001_20260609_monthly\.xlsx",
    ):
        parse_file_name("acme_SH001_20260609_monthly.xlsx")


def test_build_batch_archive_path_uses_brand_batch_raw_layout():
    archive_path = build_batch_archive_path(
        brand_id="brand-001",
        batch_id="batch-123",
        file_name="acme_SH001_20260609_daily.xlsx",
    )

    assert archive_path == Path(
        "brands",
        "brand-001",
        "batches",
        "batch-123",
        "raw",
        "acme_SH001_20260609_daily.xlsx",
    )


def test_split_batch_files_rejects_brand_mismatch():
    with pytest.raises(
        ValueError,
        match=r"Brand mismatch for other_SH001_20260609_daily\.xlsx: expected acme, got other",
    ):
        split_batch_files("acme", ["other_SH001_20260609_daily.xlsx"])


@pytest.mark.parametrize(
    ("brand_id", "batch_id", "file_name", "expected_message"),
    [
        ("..", "batch-123", "report.xlsx", r"Invalid brand_id: parent traversal is not allowed"),
        ("brand-001", "nested/batch", "report.xlsx", r"Invalid batch_id: path separators are not allowed"),
        ("brand-001", "batch-123", r"nested\report.xlsx", r"Invalid file_name: path separators are not allowed"),
        ("brand-001", "batch-123", "/tmp/report.xlsx", r"Invalid file_name: absolute paths are not allowed"),
    ],
)
def test_build_batch_archive_path_rejects_unsafe_segments(
    brand_id: str,
    batch_id: str,
    file_name: str,
    expected_message: str,
):
    with pytest.raises(ValueError, match=expected_message):
        build_batch_archive_path(
            brand_id=brand_id,
            batch_id=batch_id,
            file_name=file_name,
        )
