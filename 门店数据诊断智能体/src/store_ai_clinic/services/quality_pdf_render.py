from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import os
import re
import shutil
import subprocess

from store_ai_clinic.config import settings


class PdfRenderError(RuntimeError):
    """Raised when a PDF page cannot be rendered to an image."""


@dataclass(slots=True)
class ChromePdfPageRenderer:
    output_root: Path | None = None
    browser_path: str | None = None
    timeout_seconds: int = 20

    def render_first_page(self, pdf_path: Path) -> Path:
        pages = self.render_pages(pdf_path)
        if not pages:
            raise PdfRenderError(f"PDF renderer did not create a preview: {pdf_path}")
        return pages[0]

    def render_pages(self, pdf_path: Path) -> list[Path]:
        if not pdf_path.exists() or not pdf_path.is_file():
            raise PdfRenderError(f"PDF file does not exist: {pdf_path}")

        output_root = (self.output_root or Path(settings.local_storage_root) / "quality" / "pdf-pages").resolve()
        output_root.mkdir(parents=True, exist_ok=True)
        embedded_images = _extract_dct_images(pdf_path, output_root)
        if embedded_images:
            return embedded_images

        browser = self.browser_path or _find_browser_path()
        if not browser:
            raise PdfRenderError("No Chrome or Edge browser executable was found for PDF rendering")

        cache_key = _pdf_cache_key(pdf_path)
        page_count = max(1, _read_pdf_page_count(pdf_path))
        user_data_dir = output_root / "chrome-profile"
        user_data_dir.mkdir(parents=True, exist_ok=True)

        output_paths: list[Path] = []
        for page_index in range(1, page_count + 1):
            output_path = output_root / f"{cache_key}-page-{page_index}.png"
            command = [
                browser,
                "--headless=new",
                "--disable-gpu",
                "--disable-crash-reporter",
                "--disable-background-networking",
                "--disable-extensions",
                "--no-first-run",
                "--hide-scrollbars",
                f"--user-data-dir={user_data_dir}",
                "--window-size=1240,1754",
                "--virtual-time-budget=3000",
                f"--screenshot={output_path}",
                f"{pdf_path.resolve().as_uri()}#page={page_index}",
            ]
            try:
                subprocess.run(command, check=True, capture_output=True, timeout=self.timeout_seconds)
            except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
                raise PdfRenderError(str(exc)) from exc

            if not output_path.exists() or output_path.stat().st_size <= 0:
                raise PdfRenderError("PDF renderer did not create a screenshot")
            output_paths.append(output_path)
        return output_paths



def _extract_dct_images(pdf_path: Path, output_root: Path) -> list[Path]:
    data = pdf_path.read_bytes()
    images: list[tuple[int, bytes]] = []
    for match in re.finditer(rb"<<(.*?)>>\s*stream\r?\n", data, flags=re.S):
        header = match.group(1)
        if b"/Image" not in header or b"DCTDecode" not in header:
            continue
        stream_start = match.end()
        stream_end = data.find(b"endstream", stream_start)
        if stream_end < 0:
            continue
        width = _pdf_number(header, b"Width")
        height = _pdf_number(header, b"Height")
        area = width * height
        if area <= 0:
            continue
        payload = data[stream_start:stream_end].rstrip(b"\r\n")
        if payload.startswith(b"\xff\xd8"):
            images.append((area, payload))
    if not images:
        return []
    max_area = max(area for area, _payload in images)
    full_page_images = [(area, payload) for area, payload in images if area >= max(250_000, max_area * 0.25)]
    if not full_page_images:
        return []
    cache_key = _pdf_cache_key(pdf_path)
    output_paths: list[Path] = []
    for page_index, (_area, payload) in enumerate(full_page_images, start=1):
        output_path = output_root / f"{cache_key}-embedded-page-{page_index}.jpg"
        output_path.write_bytes(payload)
        output_paths.append(output_path)
    return output_paths


def _pdf_number(header: bytes, name: bytes) -> int:
    match = re.search(rb"/" + name + rb"\s+(\d+)", header)
    return int(match.group(1)) if match else 0

def _read_pdf_page_count(path: Path) -> int:
    try:
        text = path.read_bytes().decode("latin1", errors="ignore")
    except OSError:
        return 0
    return len(re.findall(r"/Type\s*/Page\b", text))

def _find_browser_path() -> str | None:
    env_path = os.environ.get("CHROME_PATH") or os.environ.get("EDGE_PATH")
    candidates = [
        env_path,
        shutil.which("chrome"),
        shutil.which("chrome.exe"),
        shutil.which("msedge"),
        shutil.which("msedge.exe"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return str(candidate)
    return None


def _pdf_cache_key(pdf_path: Path) -> str:
    stat = pdf_path.stat()
    payload = f"{pdf_path.resolve()}|{stat.st_size}|{stat.st_mtime_ns}".encode("utf-8", errors="ignore")
    return hashlib.sha256(payload).hexdigest()[:24]


