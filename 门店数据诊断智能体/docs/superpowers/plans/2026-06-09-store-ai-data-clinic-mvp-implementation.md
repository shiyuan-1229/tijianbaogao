# Store AI Data Clinic MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable MVP of the Store AI Data Clinic platform, covering Streamlit navigation, brand onboarding, batch upload, task overview, human review, card closure, backend orchestration, and LangGraph pause/resume with traceable versions.

**Architecture:** Use a Python monorepo with a Streamlit frontend, a FastAPI backend, SQLAlchemy models backed by PostgreSQL, and a LangGraph workflow for one-store diagnosis execution. Deliver the system in four milestone slices so each slice leaves the workspace in a runnable, testable state before moving deeper into integrations.

**Tech Stack:** Python 3.12, Streamlit, FastAPI, SQLAlchemy, Alembic, PostgreSQL, LangGraph, Pydantic Settings, pytest

---

## Scope Check

The design spec spans four subsystems that could have been separate plans:

1. Streamlit frontend
2. Backend API and task orchestration
3. LangGraph workflow and pause/resume contract
4. Persistence, versioning, and card closure

This plan keeps them in one execution document because the product requires a single vertical slice to be useful. The execution boundary is milestone-based:

1. `M1` gives a runnable shell with mock data and task persistence.
2. `M2` gives batch splitting plus daily diagnosis workflow.
3. `M3` gives human review plus resume from checkpoint.
4. `M4` gives card closure, result diff, and launch hardening.

Stop after any milestone if review feedback or scope control is needed.

## File Structure

Create these files first and keep responsibilities narrow.

### Root and Tooling

- `pyproject.toml`: Python package metadata, dependencies, pytest configuration
- `.env.example`: local environment contract for database and storage settings
- `README.md`: runbook for local development and milestone commands
- `.streamlit/config.toml`: Streamlit theme and server defaults
- `streamlit_app.py`: Streamlit entrypoint and top-level navigation shell
- `alembic.ini`: migration configuration

### Backend Application

- `src/store_ai_clinic/config.py`: typed runtime settings
- `src/store_ai_clinic/db/base.py`: SQLAlchemy base and metadata import registry
- `src/store_ai_clinic/db/session.py`: engine and session factory
- `src/store_ai_clinic/models/__init__.py`: model package exports
- `src/store_ai_clinic/models/enums.py`: shared enums for diagnosis, task, review, and card states
- `src/store_ai_clinic/models/brands.py`: brands, file templates, onboarding samples
- `src/store_ai_clinic/models/rules.py`: rule bundles, child rule tables, strategies
- `src/store_ai_clinic/models/tasks.py`: diagnosis batches, diagnosis tasks, task results
- `src/store_ai_clinic/models/reviews.py`: human review records
- `src/store_ai_clinic/models/cards.py`: result cards, card evidences, card actions
- `src/store_ai_clinic/models/alerts.py`: system alerts, audit logs
- `src/store_ai_clinic/schemas/onboarding.py`: request and response schemas for onboarding
- `src/store_ai_clinic/schemas/batches.py`: request and response schemas for uploads and tasks
- `src/store_ai_clinic/schemas/reviews.py`: request and response schemas for review actions
- `src/store_ai_clinic/schemas/cards.py`: request and response schemas for card closure and result diff
- `src/store_ai_clinic/services/storage.py`: storage path builder and archive adapter
- `src/store_ai_clinic/services/onboarding.py`: onboarding flow service
- `src/store_ai_clinic/services/batches.py`: filename validation, grouping, batch splitting
- `src/store_ai_clinic/services/reviews.py`: review save and resume preparation
- `src/store_ai_clinic/services/cards.py`: card state transition service
- `src/store_ai_clinic/services/results.py`: result version diff service
- `src/store_ai_clinic/api/main.py`: FastAPI app
- `src/store_ai_clinic/api/routers/__init__.py`: router package exports
- `src/store_ai_clinic/api/routers/onboarding.py`: onboarding routes
- `src/store_ai_clinic/api/routers/batches.py`: upload, task, and batch routes
- `src/store_ai_clinic/api/routers/reviews.py`: human review routes
- `src/store_ai_clinic/api/routers/cards.py`: card closure and result routes

### Workflow

- `src/store_ai_clinic/workflows/state.py`: LangGraph state object
- `src/store_ai_clinic/workflows/signals.py`: pause and resume contracts
- `src/store_ai_clinic/workflows/nodes.py`: ingest, clean, validate, metrics, diagnose, report nodes
- `src/store_ai_clinic/workflows/graph.py`: graph builder

### Streamlit Frontend

- `pages/01_首页指挥台.py`: dashboard view
- `pages/02_品牌接入.py`: onboarding wizard
- `pages/03_批量上传.py`: upload and pre-validation
- `pages/04_任务总览.py`: master-detail task view
- `pages/05_人工确认台.py`: triage console
- `pages/06_卡片闭环.py`: card execution workbench
- `components/layout.py`: page shell, summary strip, detail panel helpers
- `components/status.py`: status badges and SLA markers
- `components/tables.py`: task, batch, and review table helpers
- `components/cards.py`: main card and evidence card renderers
- `services/frontend_api.py`: backend client wrappers
- `services/mock_data.py`: local mock dataset used before API integration
- `styles/theme.css`: product styling
- `assets/empty-state.svg`: empty state illustration

### Tests

- `tests/conftest.py`: shared fixtures
- `tests/unit/test_config.py`: settings tests
- `tests/unit/test_models.py`: metadata and enum tests
- `tests/unit/services/test_batches.py`: filename parsing and task splitting tests
- `tests/unit/services/test_reviews.py`: pause/resume persistence tests
- `tests/unit/services/test_cards.py`: card status transition tests
- `tests/unit/services/test_results.py`: result diff tests
- `tests/unit/workflows/test_graph.py`: workflow contract tests
- `tests/unit/ui/test_navigation.py`: navigation registration tests
- `tests/unit/ui/test_dashboard_page.py`: Streamlit dashboard rendering test
- `tests/unit/ui/test_review_page.py`: Streamlit review rendering test
- `tests/integration/test_api_flow.py`: API happy path
- `tests/integration/test_mvp_flow.py`: end-to-end batch to card flow

## Milestone Map

1. `M1`: repository bootstrap, persistence schema, mock Streamlit shell
2. `M2`: batch splitting, storage archiving, API foundation, daily workflow skeleton
3. `M3`: human review queue, checkpoint resume contract, onboarding and upload integration
4. `M4`: card closure, result diff, alert surfacing, end-to-end smoke verification

## Task 1: Bootstrap the Python Monorepo and Runtime Settings

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `README.md`
- Create: `src/store_ai_clinic/__init__.py`
- Create: `src/store_ai_clinic/config.py`
- Create: `tests/conftest.py`
- Create: `tests/unit/test_config.py`

- [ ] **Step 1: Write the failing settings test**

```python
# tests/unit/test_config.py
from store_ai_clinic.config import Settings


def test_settings_defaults(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = Settings(_env_file=None)
    assert settings.app_name == "Store AI Data Clinic"
    assert settings.default_timezone == "Asia/Shanghai"
    assert settings.streamlit_entry == "streamlit_app.py"
    assert settings.local_storage_root == "data"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/test_config.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'store_ai_clinic'`

- [ ] **Step 3: Write the minimal package and settings implementation**

```toml
# pyproject.toml
[project]
name = "store-ai-data-clinic"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "streamlit>=1.45",
  "fastapi>=0.115",
  "uvicorn>=0.30",
  "sqlalchemy>=2.0",
  "alembic>=1.13",
  "psycopg[binary]>=3.2",
  "pydantic-settings>=2.3",
  "langgraph>=0.2",
  "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.2",
  "httpx>=0.27",
]

[tool.pytest.ini_options]
pythonpath = ["src", "."]
testpaths = ["tests"]
```

```env
# .env.example
DATABASE_URL=postgresql+psycopg://clinic:clinic@localhost:5432/clinic
LOCAL_STORAGE_ROOT=data
DEFAULT_TIMEZONE=Asia/Shanghai
API_BASE_URL=http://127.0.0.1:8000
```

```python
# src/store_ai_clinic/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Store AI Data Clinic"
    database_url: str = "postgresql+psycopg://clinic:clinic@localhost:5432/clinic"
    local_storage_root: str = "data"
    default_timezone: str = "Asia/Shanghai"
    streamlit_entry: str = "streamlit_app.py"
    api_base_url: str = "http://127.0.0.1:8000"


settings = Settings()
```

```python
# tests/conftest.py
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/unit/test_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml .env.example README.md src/store_ai_clinic/__init__.py src/store_ai_clinic/config.py tests/conftest.py tests/unit/test_config.py
git commit -m "chore: bootstrap clinic python workspace"
```

## Task 2: Define Shared Enums, Core Tables, and Migrations

**Files:**
- Create: `alembic.ini`
- Create: `src/store_ai_clinic/db/base.py`
- Create: `src/store_ai_clinic/db/session.py`
- Create: `src/store_ai_clinic/models/__init__.py`
- Create: `src/store_ai_clinic/models/enums.py`
- Create: `src/store_ai_clinic/models/brands.py`
- Create: `src/store_ai_clinic/models/rules.py`
- Create: `src/store_ai_clinic/models/tasks.py`
- Create: `src/store_ai_clinic/models/reviews.py`
- Create: `src/store_ai_clinic/models/cards.py`
- Create: `src/store_ai_clinic/models/alerts.py`
- Create: `tests/unit/test_models.py`

- [ ] **Step 1: Write the failing model metadata test**

```python
# tests/unit/test_models.py
from store_ai_clinic.db.base import Base


def test_core_tables_registered():
    table_names = set(Base.metadata.tables)
    expected = {
        "brands",
        "brand_file_templates",
        "brand_rule_bundles",
        "diagnosis_batches",
        "diagnosis_tasks",
        "task_results",
        "human_review_records",
        "result_cards",
        "card_evidences",
        "card_actions",
        "system_alerts",
        "audit_logs",
    }
    assert expected.issubset(table_names)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/test_models.py -v`
Expected: FAIL because `Base.metadata.tables` is empty

- [ ] **Step 3: Implement the database base, enums, and first-pass models**

```python
# src/store_ai_clinic/models/enums.py
from enum import StrEnum


class DiagnosisType(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"


class TaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_HUMAN = "waiting_human"
    COMPLETED = "completed"
    FAILED = "failed"


class GraphStage(StrEnum):
    INGEST = "ingest"
    CLEAN = "clean"
    CLEAN_VALIDATE = "clean_validate"
    METRICS = "metrics"
    METRICS_VALIDATE = "metrics_validate"
    DIAGNOSE = "diagnose"
    DIAGNOSIS_VALIDATE = "diagnosis_validate"
    REPORT = "report"
```

```python
# src/store_ai_clinic/db/base.py
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from store_ai_clinic.models import alerts, brands, cards, reviews, rules, tasks  # noqa: E402,F401
```

```python
# src/store_ai_clinic/models/__init__.py
from . import alerts, brands, cards, reviews, rules, tasks

__all__ = ["alerts", "brands", "cards", "reviews", "rules", "tasks"]
```

```python
# src/store_ai_clinic/models/brands.py
from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base


class Brand(Base):
    __tablename__ = "brands"

    brand_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_name: Mapped[str] = mapped_column(String(120), nullable=False)
    brand_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(40), nullable=False, default="Asia/Shanghai")
    onboarding_status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")


class BrandFileTemplate(Base):
    __tablename__ = "brand_file_templates"

    template_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)
    template_pattern: Mapped[str] = mapped_column(String(255), nullable=False)
    parse_example_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
```

```python
# src/store_ai_clinic/models/tasks.py
from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base


class DiagnosisBatch(Base):
    __tablename__ = "diagnosis_batches"

    batch_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    diagnosis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    file_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    store_task_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class DiagnosisTask(Base):
    __tablename__ = "diagnosis_tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    diagnosis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    task_status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    graph_stage: Mapped[str] = mapped_column(String(30), nullable=False, default="ingest")
    checkpoint_thread_id: Mapped[str | None] = mapped_column(String(64))
    human_wait_type: Mapped[str | None] = mapped_column(String(40))
    human_wait_reason: Mapped[str | None] = mapped_column(String(255))
```

```python
# src/store_ai_clinic/models/reviews.py
from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base


class HumanReviewRecord(Base):
    __tablename__ = "human_review_records"

    review_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    review_type: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    action_hint: Mapped[str] = mapped_column(Text, nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(40))
    before_after_diff_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    critical_snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
```

```python
# src/store_ai_clinic/models/cards.py
from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base


class ResultCard(Base):
    __tablename__ = "result_cards"

    card_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    card_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="new")
    action_suggestions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class CardEvidence(Base):
    __tablename__ = "card_evidences"

    evidence_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    parent_card_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(120), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)


class CardAction(Base):
    __tablename__ = "card_actions"

    action_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    card_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    from_status: Mapped[str] = mapped_column(String(30), nullable=False)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    comment_text: Mapped[str | None] = mapped_column(Text)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/unit/test_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add alembic.ini src/store_ai_clinic/db src/store_ai_clinic/models tests/unit/test_models.py
git commit -m "feat: add core clinic data models"
```

## Task 3: Implement Filename Parsing, Batch Splitting, and Storage Archiving

**Files:**
- Create: `src/store_ai_clinic/services/storage.py`
- Create: `src/store_ai_clinic/services/batches.py`
- Create: `tests/unit/services/test_batches.py`

- [ ] **Step 1: Write the failing batch split test**

```python
# tests/unit/services/test_batches.py
from store_ai_clinic.services.batches import split_batch_files


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/services/test_batches.py -v`
Expected: FAIL because `split_batch_files` does not exist

- [ ] **Step 3: Implement filename parsing, store grouping, and archive path helpers**

```python
# src/store_ai_clinic/services/storage.py
from pathlib import Path


def build_batch_archive_path(brand_id: str, batch_id: str, file_name: str) -> Path:
    return Path("brands") / brand_id / "batches" / batch_id / "raw" / file_name
```

```python
# src/store_ai_clinic/services/batches.py
from collections import defaultdict
import re


FILE_RE = re.compile(
    r"^(?P<brand>[A-Za-z0-9]+)_(?P<store>[A-Za-z0-9]+)_(?P<biz_date>\d{8})_(?P<report_type>daily|weekly)\.(xlsx|csv)$"
)


def parse_file_name(file_name: str) -> dict:
    match = FILE_RE.match(file_name)
    if not match:
        raise ValueError(f"Invalid file name: {file_name}")
    return match.groupdict()


def split_batch_files(brand_code: str, file_names: list[str]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for file_name in file_names:
        parsed = parse_file_name(file_name)
        if parsed["brand"] != brand_code:
            raise ValueError(f"Brand mismatch: {file_name}")
        grouped[parsed["store"]].append(file_name)
    return dict(grouped)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/unit/services/test_batches.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/services/storage.py src/store_ai_clinic/services/batches.py tests/unit/services/test_batches.py
git commit -m "feat: add batch file parsing and grouping"
```

## Task 4: Build the LangGraph State Model and Pause/Resume Contract

**Files:**
- Create: `src/store_ai_clinic/workflows/state.py`
- Create: `src/store_ai_clinic/workflows/signals.py`
- Create: `src/store_ai_clinic/workflows/nodes.py`
- Create: `src/store_ai_clinic/workflows/graph.py`
- Create: `tests/unit/workflows/test_graph.py`

- [ ] **Step 1: Write the failing workflow contract test**

```python
# tests/unit/workflows/test_graph.py
from store_ai_clinic.workflows.graph import build_graph
from store_ai_clinic.workflows.signals import PauseSignal


def test_build_graph_exposes_pause_signal():
    graph = build_graph()
    state = {
        "task_id": "task-1",
        "store_id": "store-1",
        "diagnosis_type": "daily",
        "pause_at_stage": "clean_validate",
    }
    result = graph.invoke(state)
    assert isinstance(result["pause_signal"], PauseSignal)
    assert result["pause_signal"].pause_type == "data_quality_review"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/workflows/test_graph.py -v`
Expected: FAIL because `build_graph` does not exist

- [ ] **Step 3: Implement state, pause contract, and minimal graph**

```python
# src/store_ai_clinic/workflows/signals.py
from dataclasses import dataclass


@dataclass(slots=True)
class PauseSignal:
    pause_type: str
    reason: str
    action_hint: str
```

```python
# src/store_ai_clinic/workflows/state.py
from typing import TypedDict

from store_ai_clinic.workflows.signals import PauseSignal


class ClinicState(TypedDict, total=False):
    task_id: str
    store_id: str
    diagnosis_type: str
    graph_stage: str
    pause_at_stage: str | None
    pause_signal: PauseSignal | None
```

```python
# src/store_ai_clinic/workflows/graph.py
from langgraph.graph import END, START, StateGraph

from store_ai_clinic.workflows.signals import PauseSignal
from store_ai_clinic.workflows.state import ClinicState


def ingest(state: ClinicState) -> ClinicState:
    state["graph_stage"] = "ingest"
    return state


def clean_validate(state: ClinicState) -> ClinicState:
    state["graph_stage"] = "clean_validate"
    if state.get("pause_at_stage") == "clean_validate":
        state["pause_signal"] = PauseSignal(
            pause_type="data_quality_review",
            reason="Detected inconsistent column values",
            action_hint="Review sample rows and choose a correction",
        )
    return state


def build_graph():
    graph = StateGraph(ClinicState)
    graph.add_node("ingest", ingest)
    graph.add_node("clean_validate", clean_validate)
    graph.add_edge(START, "ingest")
    graph.add_edge("ingest", "clean_validate")
    graph.add_edge("clean_validate", END)
    return graph.compile()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/unit/workflows/test_graph.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/workflows tests/unit/workflows/test_graph.py
git commit -m "feat: add workflow pause and resume contract"
```

## Task 5: Stand Up FastAPI Routes for Onboarding, Batches, Reviews, and Cards

**Files:**
- Create: `src/store_ai_clinic/api/main.py`
- Create: `src/store_ai_clinic/api/routers/__init__.py`
- Create: `src/store_ai_clinic/api/routers/onboarding.py`
- Create: `src/store_ai_clinic/api/routers/batches.py`
- Create: `src/store_ai_clinic/api/routers/reviews.py`
- Create: `src/store_ai_clinic/api/routers/cards.py`
- Create: `src/store_ai_clinic/schemas/onboarding.py`
- Create: `src/store_ai_clinic/schemas/batches.py`
- Create: `src/store_ai_clinic/schemas/reviews.py`
- Create: `src/store_ai_clinic/schemas/cards.py`
- Create: `tests/integration/test_api_flow.py`

- [ ] **Step 1: Write the failing API flow test**

```python
# tests/integration/test_api_flow.py
from fastapi.testclient import TestClient

from store_ai_clinic.api.main import app


def test_health_and_batch_preview():
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    preview = client.post(
        "/api/batches/preview",
        json={
            "brand_code": "acme",
            "diagnosis_type": "daily",
            "files": ["acme_SH001_20260609_daily.xlsx"],
        },
    )
    assert preview.status_code == 200
    assert preview.json()["store_task_count"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/integration/test_api_flow.py -v`
Expected: FAIL because `store_ai_clinic.api.main` does not exist

- [ ] **Step 3: Implement API app, request schemas, and preview route**

```python
# src/store_ai_clinic/schemas/batches.py
from pydantic import BaseModel


class BatchPreviewRequest(BaseModel):
    brand_code: str
    diagnosis_type: str
    files: list[str]


class BatchPreviewResponse(BaseModel):
    store_task_count: int
    grouped_files: dict[str, list[str]]
```

```python
# src/store_ai_clinic/api/routers/batches.py
from fastapi import APIRouter

from store_ai_clinic.schemas.batches import BatchPreviewRequest, BatchPreviewResponse
from store_ai_clinic.services.batches import split_batch_files


router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.post("/preview", response_model=BatchPreviewResponse)
def preview_batch(payload: BatchPreviewRequest) -> BatchPreviewResponse:
    grouped = split_batch_files(payload.brand_code, payload.files)
    return BatchPreviewResponse(
        store_task_count=len(grouped),
        grouped_files=grouped,
    )
```

```python
# src/store_ai_clinic/api/routers/onboarding.py
from fastapi import APIRouter


router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])
```

```python
# src/store_ai_clinic/api/routers/reviews.py
from fastapi import APIRouter


router = APIRouter(prefix="/api/reviews", tags=["reviews"])
```

```python
# src/store_ai_clinic/api/routers/cards.py
from fastapi import APIRouter


router = APIRouter(prefix="/api/cards", tags=["cards"])
```

```python
# src/store_ai_clinic/api/routers/__init__.py
from . import batches, cards, onboarding, reviews

__all__ = ["batches", "cards", "onboarding", "reviews"]
```

```python
# src/store_ai_clinic/api/main.py
from fastapi import FastAPI

from store_ai_clinic.api.routers import batches, cards, onboarding, reviews


app = FastAPI(title="Store AI Data Clinic API")
app.include_router(onboarding.router)
app.include_router(batches.router)
app.include_router(reviews.router)
app.include_router(cards.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/integration/test_api_flow.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/api src/store_ai_clinic/schemas tests/integration/test_api_flow.py
git commit -m "feat: add clinic api skeleton"
```

## Task 6: Build the Streamlit Navigation Shell and Mock Data Layer

**Files:**
- Create: `.streamlit/config.toml`
- Create: `streamlit_app.py`
- Create: `services/mock_data.py`
- Create: `components/layout.py`
- Create: `components/status.py`
- Create: `styles/theme.css`
- Create: `pages/01_首页指挥台.py`
- Create: `pages/02_品牌接入.py`
- Create: `pages/03_批量上传.py`
- Create: `pages/04_任务总览.py`
- Create: `pages/05_人工确认台.py`
- Create: `pages/06_卡片闭环.py`
- Create: `tests/unit/ui/test_navigation.py`

- [ ] **Step 1: Write the failing navigation test**

```python
# tests/unit/ui/test_navigation.py
from pathlib import Path


def test_primary_navigation_pages_exist():
    page_names = {path.name for path in Path("pages").glob("*.py")}
    assert {
        "01_首页指挥台.py",
        "02_品牌接入.py",
        "03_批量上传.py",
        "04_任务总览.py",
        "05_人工确认台.py",
        "06_卡片闭环.py",
    }.issubset(page_names)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/ui/test_navigation.py -v`
Expected: FAIL because `pages/` does not contain the required files

- [ ] **Step 3: Implement the entrypoint, theme, and mock shell**

```toml
# .streamlit/config.toml
[theme]
base = "light"
primaryColor = "#167C74"
backgroundColor = "#F5F7F7"
secondaryBackgroundColor = "#E8EEEC"
textColor = "#1F2A2A"
```

```python
# services/mock_data.py
def dashboard_summary() -> dict[str, int]:
    return {
        "running": 12,
        "waiting_human": 3,
        "sla_risk": 2,
        "completed": 28,
    }
```

```python
# streamlit_app.py
import streamlit as st

st.set_page_config(page_title="门店 AI 数据门诊", layout="wide")
st.title("门店 AI 数据门诊")
st.caption("首页请从左侧导航进入具体工作台。")
```

```python
# pages/01_首页指挥台.py
import streamlit as st

from services.mock_data import dashboard_summary


st.title("首页指挥台")
summary = dashboard_summary()
cols = st.columns(4)
cols[0].metric("运行中任务", summary["running"])
cols[1].metric("待人工确认", summary["waiting_human"])
cols[2].metric("超 SLA", summary["sla_risk"])
cols[3].metric("已完成", summary["completed"])
```

- [ ] **Step 4: Run tests and the Streamlit smoke check**

Run: `python -m pytest tests/unit/ui/test_navigation.py -v`
Expected: PASS

Run: `streamlit run streamlit_app.py --server.headless true`
Expected: server starts and prints a local URL without import errors

- [ ] **Step 5: Commit**

```bash
git add .streamlit/config.toml streamlit_app.py services/mock_data.py components pages styles tests/unit/ui/test_navigation.py
git commit -m "feat: add streamlit shell and navigation"
```

## Task 7: Deliver the Dashboard, Task Overview, and Human Review Mock Experience

**Files:**
- Create: `components/tables.py`
- Create: `tests/unit/ui/test_dashboard_page.py`
- Create: `tests/unit/ui/test_review_page.py`
- Modify: `services/mock_data.py`
- Modify: `pages/01_首页指挥台.py`
- Modify: `pages/04_任务总览.py`
- Modify: `pages/05_人工确认台.py`

- [ ] **Step 1: Write the failing Streamlit rendering tests**

```python
# tests/unit/ui/test_dashboard_page.py
from streamlit.testing.v1 import AppTest


def test_dashboard_page_renders_summary_and_todo():
    at = AppTest.from_file("pages/01_首页指挥台.py").run()
    assert at.title[0].value == "首页指挥台"
    assert any("待人工确认" in str(node.value) for node in at.metric)
```

```python
# tests/unit/ui/test_review_page.py
from streamlit.testing.v1 import AppTest


def test_review_page_renders_three_review_queues():
    at = AppTest.from_file("pages/05_人工确认台.py").run()
    assert at.title[0].value == "人工确认台"
    labels = [str(node.value) for node in at.markdown]
    assert any("字段映射确认" in value for value in labels)
    assert any("数据质量确认" in value for value in labels)
    assert any("诊断复核确认" in value for value in labels)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/unit/ui/test_dashboard_page.py tests/unit/ui/test_review_page.py -v`
Expected: FAIL because required sections are not rendered yet

- [ ] **Step 3: Expand mock data and build the three high-frequency pages**

```python
# services/mock_data.py
def task_rows() -> list[dict]:
    return [
        {
            "task_id": "task-1001",
            "brand": "Acme Coffee",
            "store": "SH001",
            "diagnosis_type": "daily",
            "task_status": "waiting_human",
            "graph_stage": "clean_validate",
            "sla_risk": True,
        },
        {
            "task_id": "task-1002",
            "brand": "Acme Coffee",
            "store": "SH002",
            "diagnosis_type": "daily",
            "task_status": "running",
            "graph_stage": "metrics",
            "sla_risk": False,
        },
    ]


def review_rows() -> dict[str, list[dict]]:
    return {
        "字段映射确认": [{"task_id": "task-2001", "store": "SH003", "reason": "字段别名冲突"}],
        "数据质量确认": [{"task_id": "task-2002", "store": "SH004", "reason": "关键指标缺失"}],
        "诊断复核确认": [{"task_id": "task-2003", "store": "SH005", "reason": "结论置信度偏低"}],
    }
```

```python
# pages/04_任务总览.py
import pandas as pd
import streamlit as st

from services.mock_data import task_rows


st.title("任务总览")
rows = task_rows()
st.dataframe(pd.DataFrame(rows), use_container_width=True)
selected = rows[0]
with st.container(border=True):
    st.subheader("任务详情")
    st.write(selected)
```

```python
# pages/05_人工确认台.py
import streamlit as st

from services.mock_data import review_rows


st.title("人工确认台")
queues = review_rows()
for queue_name, items in queues.items():
    st.markdown(f"### {queue_name}")
    for item in items:
        with st.container(border=True):
            st.write(item)
            st.button("提交确认并恢复执行", key=f"resume-{item['task_id']}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/unit/ui/test_dashboard_page.py tests/unit/ui/test_review_page.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/tables.py services/mock_data.py pages/01_首页指挥台.py pages/04_任务总览.py pages/05_人工确认台.py tests/unit/ui/test_dashboard_page.py tests/unit/ui/test_review_page.py
git commit -m "feat: add dashboard tasks and review mock experience"
```

## Task 8: Implement Brand Onboarding and Batch Upload with API-Ready Adapters

**Files:**
- Create: `services/frontend_api.py`
- Create: `src/store_ai_clinic/services/onboarding.py`
- Modify: `pages/02_品牌接入.py`
- Modify: `pages/03_批量上传.py`
- Create: `tests/unit/services/test_reviews.py`
- Modify: `src/store_ai_clinic/api/routers/onboarding.py`

- [ ] **Step 1: Write the failing onboarding preview test**

```python
# tests/unit/services/test_reviews.py
from store_ai_clinic.services.onboarding import preview_template_parse


def test_preview_template_parse_extracts_template_tokens():
    preview = preview_template_parse("{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx")
    assert preview["required_tokens"] == ["brand_code", "store_code", "biz_date", "report_type"]
    assert preview["report_types"] == ["daily", "weekly"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/unit/services/test_reviews.py -v`
Expected: FAIL because `preview_template_parse` does not exist

- [ ] **Step 3: Implement onboarding preview logic and Streamlit forms**

```python
# src/store_ai_clinic/services/onboarding.py
def preview_template_parse(pattern: str) -> dict:
    required_tokens = ["brand_code", "store_code", "biz_date", "report_type"]
    for token in required_tokens:
        if "{" + token + "}" not in pattern:
            raise ValueError(f"Missing token: {token}")
    return {
        "required_tokens": required_tokens,
        "report_types": ["daily", "weekly"],
        "example": "acme_SH001_20260609_daily.xlsx",
    }
```

```python
# src/store_ai_clinic/api/routers/onboarding.py
from fastapi import APIRouter

from store_ai_clinic.services.onboarding import preview_template_parse


router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/template-preview")
def template_preview(payload: dict) -> dict:
    return preview_template_parse(payload["pattern"])
```

```python
# services/frontend_api.py
import requests

from store_ai_clinic.config import settings


def preview_batch(payload: dict) -> dict:
    response = requests.post(f"{settings.api_base_url}/api/batches/preview", json=payload, timeout=5)
    response.raise_for_status()
    return response.json()
```

```python
# pages/02_品牌接入.py
import streamlit as st


st.title("品牌接入")
step = st.segmented_control("接入步骤", ["品牌信息", "命名模板配置", "样例上传", "接入确认"], default="品牌信息")
st.write(f"当前步骤：{step}")
st.text_input("品牌名称")
st.text_input("品牌编码")
st.text_input("日报模板", value="{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx")
st.file_uploader("上传日报和周报样例", accept_multiple_files=True)
st.button("保存为草稿")
st.button("确认接入上线", type="primary")
```

```python
# pages/03_批量上传.py
import streamlit as st

from services.frontend_api import preview_batch


st.title("批量上传")
files = st.file_uploader("上传日报或周报文件", accept_multiple_files=True)
if st.button("预校验"):
    payload = {
        "brand_code": "acme",
        "diagnosis_type": "daily",
        "files": [file.name for file in files],
    }
    st.json(preview_batch(payload))
```

- [ ] **Step 4: Run tests and verify the upload page still starts**

Run: `python -m pytest tests/unit/services/test_reviews.py -v`
Expected: PASS

Run: `streamlit run streamlit_app.py --server.headless true`
Expected: server starts and the upload page imports successfully

- [ ] **Step 5: Commit**

```bash
git add services/frontend_api.py pages/02_品牌接入.py pages/03_批量上传.py src/store_ai_clinic/services/onboarding.py src/store_ai_clinic/api/routers/onboarding.py tests/unit/services/test_reviews.py
git commit -m "feat: add onboarding and upload flow shell"
```

## Task 9: Add Review Persistence, Resume Actions, Card Closure, and Result Diff

**Files:**
- Create: `src/store_ai_clinic/services/reviews.py`
- Create: `src/store_ai_clinic/services/cards.py`
- Create: `src/store_ai_clinic/services/results.py`
- Modify: `src/store_ai_clinic/api/routers/reviews.py`
- Modify: `src/store_ai_clinic/api/routers/cards.py`
- Modify: `pages/06_卡片闭环.py`
- Create: `tests/unit/services/test_cards.py`
- Create: `tests/unit/services/test_results.py`

- [ ] **Step 1: Write the failing card transition and result diff tests**

```python
# tests/unit/services/test_cards.py
from store_ai_clinic.services.cards import next_card_status


def test_next_card_status_promotes_reviewed_card_to_processing():
    assert next_card_status("pending_review", "confirm") == "processing"
```

```python
# tests/unit/services/test_results.py
from store_ai_clinic.services.results import diff_card_sets


def test_diff_card_sets_returns_added_removed_and_changed():
    previous = [{"card_id": "1", "title": "客流异常", "summary": "old"}]
    current = [
        {"card_id": "1", "title": "客流异常", "summary": "new"},
        {"card_id": "2", "title": "转化异常", "summary": "new"},
    ]
    diff = diff_card_sets(previous, current)
    assert diff["added"] == ["2"]
    assert diff["changed"] == ["1"]
    assert diff["removed"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/unit/services/test_cards.py tests/unit/services/test_results.py -v`
Expected: FAIL because the services do not exist

- [ ] **Step 3: Implement review resume helpers, card transitions, diff logic, and closure page**

```python
# src/store_ai_clinic/services/cards.py
TRANSITIONS = {
    ("new", "confirm"): "pending_review",
    ("pending_review", "confirm"): "processing",
    ("processing", "complete"): "completed",
    ("pending_review", "ignore"): "ignored",
    ("processing", "escalate"): "escalated",
}


def next_card_status(current_status: str, action: str) -> str:
    return TRANSITIONS[(current_status, action)]
```

```python
# src/store_ai_clinic/services/reviews.py
def build_resume_payload(task_id: str, resolution: str, remark: str) -> dict:
    return {
        "task_id": task_id,
        "resolution": resolution,
        "remark": remark,
        "resume_from_checkpoint": True,
    }
```

```python
# src/store_ai_clinic/services/results.py
def diff_card_sets(previous: list[dict], current: list[dict]) -> dict[str, list[str]]:
    prev_by_id = {item["card_id"]: item for item in previous}
    curr_by_id = {item["card_id"]: item for item in current}
    added = [card_id for card_id in curr_by_id if card_id not in prev_by_id]
    removed = [card_id for card_id in prev_by_id if card_id not in curr_by_id]
    changed = [
        card_id
        for card_id in curr_by_id
        if card_id in prev_by_id and curr_by_id[card_id] != prev_by_id[card_id]
    ]
    return {"added": added, "removed": removed, "changed": changed}
```

```python
# src/store_ai_clinic/api/routers/reviews.py
from fastapi import APIRouter

from store_ai_clinic.services.reviews import build_resume_payload


router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/resume")
def resume_task(payload: dict) -> dict:
    return build_resume_payload(
        task_id=payload["task_id"],
        resolution=payload["resolution"],
        remark=payload.get("remark", ""),
    )
```

```python
# src/store_ai_clinic/api/routers/cards.py
from fastapi import APIRouter

from store_ai_clinic.services.cards import next_card_status


router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.post("/transition")
def transition_card(payload: dict) -> dict:
    return {
        "next_status": next_card_status(
            current_status=payload["current_status"],
            action=payload["action"],
        )
    }
```

```python
# pages/06_卡片闭环.py
import streamlit as st


st.title("卡片闭环")
st.markdown("### 问题主卡")
with st.container(border=True):
    st.subheader("销售转化异常")
    st.write("建议动作：核查导购排班、复盘高峰时段转化")
    st.checkbox("完成导购排班复核")
    st.checkbox("完成高峰时段抽样复盘")

st.markdown("### 证据子卡")
with st.container(border=True):
    st.write({"metric_name": "转化率", "metric_value": 0.14, "baseline_value": 0.22})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/unit/services/test_cards.py tests/unit/services/test_results.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/services/reviews.py src/store_ai_clinic/services/cards.py src/store_ai_clinic/services/results.py src/store_ai_clinic/api/routers/reviews.py src/store_ai_clinic/api/routers/cards.py pages/06_卡片闭环.py tests/unit/services/test_cards.py tests/unit/services/test_results.py
git commit -m "feat: add review resume card closure and result diff"
```

## Task 10: Finish Integration, Smoke Tests, and Operator Documentation

**Files:**
- Modify: `README.md`
- Create: `tests/integration/test_mvp_flow.py`
- Modify: `streamlit_app.py`
- Modify: `pages/04_任务总览.py`
- Modify: `pages/06_卡片闭环.py`

- [ ] **Step 1: Write the failing MVP flow test**

```python
# tests/integration/test_mvp_flow.py
from store_ai_clinic.services.batches import split_batch_files
from store_ai_clinic.services.results import diff_card_sets


def test_mvp_flow_from_batch_to_card_diff():
    grouped = split_batch_files("acme", ["acme_SH001_20260609_daily.xlsx"])
    assert list(grouped) == ["SH001"]
    diff = diff_card_sets([], [{"card_id": "c1", "title": "客流异常", "summary": "new"}])
    assert diff["added"] == ["c1"]
```

- [ ] **Step 2: Run test to verify the full slice is stable**

Run: `python -m pytest tests/integration/test_mvp_flow.py -v`
Expected: PASS after Tasks 1-9 are complete

- [ ] **Step 3: Finalize runbook, smoke commands, and acceptance checklist**

```markdown
# README.md
## Local Run

1. Install dependencies: `pip install -e .[dev]`
2. Start API: `uvicorn store_ai_clinic.api.main:app --reload`
3. Start Streamlit: `streamlit run streamlit_app.py`
4. Run tests: `python -m pytest`

## MVP Acceptance

1. Streamlit app starts without import errors.
2. Six primary pages are visible in the sidebar.
3. Dashboard shows summary metrics.
4. Task overview shows mock tasks and a detail panel.
5. Human review page shows three review queues.
6. Card closure page shows a main card and evidence card.
```

- [ ] **Step 4: Run final verification**

Run: `python -m pytest -q`
Expected: all unit and integration tests pass

Run: `uvicorn store_ai_clinic.api.main:app --reload`
Expected: API starts and `/health` returns `{"status":"ok"}`

Run: `streamlit run streamlit_app.py --server.headless true`
Expected: app starts and all six pages import successfully

- [ ] **Step 5: Commit**

```bash
git add README.md tests/integration/test_mvp_flow.py streamlit_app.py pages/04_任务总览.py pages/06_卡片闭环.py
git commit -m "docs: finalize mvp verification and runbook"
```

## Spec Coverage Check

This plan covers the design spec in executable order:

1. Project positioning and first-release scope: Tasks 1, 6, 7, 10
2. Core data model and versioning: Tasks 2 and 9
3. Brand onboarding and file template parsing: Task 8
4. Batch upload and one-store-one-task splitting: Tasks 3 and 5
5. Task status, graph stage, and priority-ready workflow shell: Tasks 2, 4, 5, 7
6. Human review as first-class behavior: Tasks 4, 7, 9
7. Card output, closure, and version diff: Task 9
8. Frontend information architecture and six primary pages: Tasks 6, 7, 8, 9
9. Persistence and API boundaries: Tasks 2, 5, 9
10. Launch acceptance and verification: Task 10

Items intentionally deferred inside this MVP plan but left structurally ready:

1. Real PostgreSQL migrations and production DDL refinement
2. Real object storage provider wiring
3. Complete weekly diagnosis logic
4. Alert background jobs and SLA timers
5. Full audit search UI

These should be implemented immediately after `M4` if the MVP passes review.

## Placeholder Scan

The plan avoids `TODO`, `TBD`, and "implement later" placeholders. Every task has:

1. Exact files
2. A failing test
3. A concrete command
4. Minimal implementation code
5. A verification command
6. A commit checkpoint

## Type Consistency Check

Shared vocabulary is consistent across tasks:

1. `daily` and `weekly` are the only report types in Task 3 and Task 8
2. `queued`, `running`, `waiting_human`, `completed`, `failed` remain the task states
3. `data_quality_review` is the pause type used by workflow and review flow
4. `new`, `pending_review`, `processing`, `completed`, `ignored`, `escalated` remain the card states

## Suggested Execution Order by Milestone

1. Execute Tasks 1-2 for `M1` repository and schema foundation.
2. Execute Tasks 3-5 for `M2` batch and API backbone.
3. Execute Tasks 6-8 for `M3` Streamlit shell and onboarding/upload workflow.
4. Execute Tasks 9-10 for `M4` review resume, card closure, and final verification.

Plan complete and saved to `docs/superpowers/plans/2026-06-09-store-ai-data-clinic-mvp-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
