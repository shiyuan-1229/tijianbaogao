from collections import defaultdict
from dataclasses import dataclass
import re
from typing import Literal


FILE_NAME_RE = re.compile(
    r"^(?P<brand>[A-Za-z0-9]+)_(?P<store>[A-Za-z0-9]+)_(?P<biz_date>\d{8})_(?P<report_type>daily|weekly)\.(?:xlsx|csv)$"
)


@dataclass(frozen=True)
class ParsedFileName:
    brand: str
    store: str
    biz_date: str
    report_type: Literal["daily", "weekly"]


def parse_file_name(file_name: str) -> ParsedFileName:
    match = FILE_NAME_RE.match(file_name)
    if match is None:
        raise ValueError(f"Invalid file name: {file_name}")

    return ParsedFileName(
        brand=match.group("brand"),
        store=match.group("store"),
        biz_date=match.group("biz_date"),
        report_type=match.group("report_type"),
    )


def split_batch_files(brand_code: str, file_names: list[str]) -> dict[str, list[str]]:
    grouped: defaultdict[str, list[str]] = defaultdict(list)

    for file_name in file_names:
        parsed = parse_file_name(file_name)
        if parsed.brand != brand_code:
            raise ValueError(
                f"Brand mismatch for {file_name}: expected {brand_code}, got {parsed.brand}"
            )

        grouped[parsed.store].append(file_name)

    return dict(grouped)
