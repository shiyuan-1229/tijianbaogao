from pathlib import Path
import subprocess

from store_ai_clinic.services.quality_pdf_render import ChromePdfPageRenderer


def _image_object(width: int, height: int, payload: bytes) -> bytes:
    return (
        f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
        "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode "
        f"/Length {len(payload)} >>\nstream\n"
    ).encode("ascii") + payload + b"\nendstream\n"


def test_pdf_renderer_extracts_largest_embedded_jpeg_before_browser(tmp_path: Path):
    small_jpeg = b"\xff\xd8small-logo\xff\xd9"
    large_jpeg = b"\xff\xd8full-report-page\xff\xd9"
    pdf = tmp_path / "scan.pdf"
    pdf.write_bytes(
        b"%PDF-1.4\n"
        + _image_object(80, 60, small_jpeg)
        + _image_object(1200, 1800, large_jpeg)
        + b"%%EOF"
    )

    renderer = ChromePdfPageRenderer(output_root=tmp_path / "rendered", browser_path="missing-browser.exe")

    output = renderer.render_first_page(pdf)

    assert output.suffix == ".jpg"
    assert output.read_bytes() == large_jpeg

def test_pdf_renderer_screenshots_each_pdf_page_with_browser_fallback(tmp_path: Path, monkeypatch):
    pdf = tmp_path / "report.pdf"
    pdf.write_bytes(b"%PDF-1.4\n" + b"/Type /Page\n" * 3 + b"%%EOF")
    commands: list[list[str]] = []

    def fake_run(command: list[str], **_kwargs):
        commands.append(command)
        screenshot_arg = next(part for part in command if part.startswith("--screenshot="))
        Path(screenshot_arg.removeprefix("--screenshot=")).write_bytes(b"\x89PNG\r\n\x1a\npage")
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("store_ai_clinic.services.quality_pdf_render.subprocess.run", fake_run)
    renderer = ChromePdfPageRenderer(output_root=tmp_path / "rendered", browser_path="fake-browser.exe")

    output_paths = renderer.render_pages(pdf)

    assert [path.name for path in output_paths] == [
        f"{output_paths[0].name.removesuffix('-page-1.png')}-page-1.png",
        f"{output_paths[0].name.removesuffix('-page-1.png')}-page-2.png",
        f"{output_paths[0].name.removesuffix('-page-1.png')}-page-3.png",
    ]
    assert [command[-1].split("#page=")[-1] for command in commands] == ["1", "2", "3"]
    assert all(path.read_bytes().startswith(b"\x89PNG") for path in output_paths)
