from pathlib import Path, PurePosixPath, PureWindowsPath


def _validate_archive_segment(label: str, value: str) -> str:
    if not value:
        raise ValueError(f"Invalid {label}: value is required")

    posix_path = PurePosixPath(value)
    windows_path = PureWindowsPath(value)

    if ".." in posix_path.parts or ".." in windows_path.parts:
        raise ValueError(f"Invalid {label}: parent traversal is not allowed")

    if (
        posix_path.is_absolute()
        or windows_path.is_absolute()
        or windows_path.drive
        or windows_path.root
    ):
        raise ValueError(f"Invalid {label}: absolute paths are not allowed")

    if len(posix_path.parts) != 1 or len(windows_path.parts) != 1:
        raise ValueError(f"Invalid {label}: path separators are not allowed")

    return value


def build_batch_archive_path(brand_id: str, batch_id: str, file_name: str) -> Path:
    safe_brand_id = _validate_archive_segment("brand_id", brand_id)
    safe_batch_id = _validate_archive_segment("batch_id", batch_id)
    safe_file_name = _validate_archive_segment("file_name", file_name)

    return Path("brands") / safe_brand_id / "batches" / safe_batch_id / "raw" / safe_file_name
