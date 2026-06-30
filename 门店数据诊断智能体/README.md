# Store AI Data Clinic

Store AI Data Clinic is currently a migration-in-progress product with:

- a FastAPI backend for diagnosis, onboarding, batch preview, and review resume APIs
- a legacy six-page Streamlit operator console for the original MVP workflow
- a new Next.js operator frontend in `store-ai-clinic-web/` for the ongoing workspace migration

## Requirements

- Python `3.12` or newer

## Local Run

1. Create or activate a Python 3.12 virtual environment.
2. Install the project and dev dependencies:

```bash
pip install -e .[dev]
```

3. Copy `.env.example` to `.env` and adjust values for your local environment.
   For the diagnosis model, configure the OpenAI-compatible variables:

```env
OPENAI_API_KEY=your-provider-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
OPENAI_TIMEOUT_SECONDS=20
```
4. Run the automated test suite:

```bash
python -m pytest
```

5. Start the FastAPI app:

```bash
uvicorn store_ai_clinic.api.main:app --reload
```

6. In a second terminal, start the Streamlit operator app:

```bash
streamlit run streamlit_app.py
```

7. In a third terminal, start the new Next.js operator frontend when you want to
   validate the migrated workspace:

```bash
cd store-ai-clinic-web
npm install
npm run dev
```

## Smoke Test Commands

Run these commands after local bootstrap to confirm the MVP wiring end to end.

```bash
python -m pytest tests/integration/test_mvp_flow.py -v
python -m pytest -q
uvicorn store_ai_clinic.api.main:app --reload
streamlit run streamlit_app.py --server.headless true
```

Expected smoke outcomes:

- `python -m pytest tests/integration/test_mvp_flow.py -v` passes.
- `python -m pytest -q` passes.
- `GET /health` returns `{"status":"ok"}` while Uvicorn is running.
- Streamlit starts without import errors and loads all six primary pages.

## Streamlit Pages

The operator console is organized into six primary workbenches:

1. `01_首页指挥台`
2. `02_品牌接入`
3. `03_批量上传`
4. `04_任务总览`
5. `05_人工确认台`
6. `06_卡片闭环`

## MVP Acceptance

- The FastAPI app starts successfully and `/health` returns `{"status":"ok"}`.
- All six primary Streamlit pages are visible and import successfully.
- The dashboard shows summary metrics for running, waiting-human, SLA-risk, and completed work.
- The task overview page shows mock task rows and a task detail panel.
- The human review page shows three review queues.
- The closure page shows a main card and an evidence card.

## Operator Notes

- Use `.venv` if the project-local environment is already provisioned.
- The current MVP uses deterministic mock data in the Streamlit pages so smoke
  verification can be repeated without external services.
- The FastAPI backend is now shared by both frontends during migration.
- `store-ai-clinic-web/` is the new operator workspace:
  - `Agent` diagnosis submit and review resume flows bridge to real FastAPI APIs.
  - file upload summaries and task event timelines are still explicitly mock-backed in the Next.js BFF until backend contracts exist.
- Streamlit remains the fallback operator surface until the Next.js frontend reaches backend parity.
- The workflow diagnosis node now supports an OpenAI-compatible LLM service.
  If the key is missing, the SDK is unavailable, or the model response is
  unusable, the workflow falls back to a deterministic draft instead of
  crashing the task.
- The new integration test `tests/integration/test_mvp_flow.py` verifies the
  batch grouping and card-diff path that stitches Tasks 1-9 together.
