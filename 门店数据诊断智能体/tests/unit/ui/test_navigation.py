from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from components.layout import render_placeholder_section
from components.status import render_status_badge


ROOT = Path(__file__).resolve().parents[3]
PAGES_DIR = ROOT / "pages"
PAGE_FILES = {
    "01_首页指挥台.py",
    "02_品牌接入.py",
    "03_批量上传.py",
    "04_任务总览.py",
    "05_人工确认台.py",
    "06_卡片闭环.py",
}


def test_primary_navigation_pages_exist():
    page_names = {path.name for path in PAGES_DIR.glob("*.py")}
    assert PAGE_FILES.issubset(page_names)


def test_shared_html_helpers_escape_interpolated_text(monkeypatch):
    calls: list[str] = []

    def fake_markdown(body: str, *, unsafe_allow_html: bool) -> None:
        assert unsafe_allow_html is True
        calls.append(body)

    monkeypatch.setattr("components.layout.st.markdown", fake_markdown)
    monkeypatch.setattr("components.status.st.markdown", fake_markdown)

    render_placeholder_section("<script>alert('x')</script>", "<b>unsafe</b>")
    render_status_badge('"><img src=x onerror=alert(1)>')

    assert "&lt;script&gt;alert" in calls[0]
    assert "<script>alert" not in calls[0]
    assert "&lt;b&gt;unsafe&lt;/b&gt;" in calls[0]
    assert "<b>unsafe</b>" not in calls[0]
    assert "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;" in calls[1]
    assert '"><img src=x onerror=alert(1)>' not in calls[1]


def test_page_modules_import_without_errors():
    for page_name in PAGE_FILES:
        page_path = PAGES_DIR / page_name
        spec = spec_from_file_location(page_path.stem, page_path)
        assert spec is not None
        assert spec.loader is not None
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
