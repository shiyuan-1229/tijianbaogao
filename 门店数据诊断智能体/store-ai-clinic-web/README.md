# Store AI Clinic Web

## Local development

1. `npm install`
2. `npm run dev`
3. Keep the FastAPI backend running at `http://127.0.0.1:8000` for real API bridges.
4. Open `http://127.0.0.1:3000/agent`

## Tests

- `npm run test`
- `npm run test -- tests/unit/agent-upload-route.test.ts tests/unit/agent-confirm-route.test.ts tests/unit/task-events-route.test.ts`
- `npm run test:e2e`

Playwright prefers its managed Chromium browser. On a clean machine, run
`npx playwright install chromium` once before `npm run test:e2e`. If that
managed browser is not present, the repo falls back to Playwright's `chrome`
channel so local smoke coverage can still run with a detectable Google Chrome
installation.

## Runtime surfaces

- `Agent` diagnosis submit is a real bridge through `POST /api/agent/run` to the FastAPI `POST /api/diagnosis/run` contract.
- `Agent` file upload summary is typed but mock-backed through `POST /api/agent/upload`; it validates multipart uploads and summarizes files without persisting them.
- `Agent` confirmation is a real bridge through `POST /api/agent/confirm` to the FastAPI `POST /api/reviews/resume` contract.
- `Tasks` detail is mock-backed through `GET /api/tasks/[taskId]` and currently returns `X-Tasks-Data-Source: mock`.
- `Tasks` events are mock-backed through `GET /api/tasks/[taskId]/events` until the Python backend exposes a workflow timeline feed.
- `Brands`, `Knowledge`, and `Settings` remain typed-adapter or mock-backed surfaces until their backend routes are ready.

## Available BFF routes

- `POST /api/agent/run`: validates the diagnosis payload and forwards it to the live FastAPI diagnosis endpoint.
- `POST /api/agent/upload`: accepts `multipart/form-data`, returns a typed file summary, and marks the response with mock persistence headers.
- `POST /api/agent/confirm`: validates review confirmation input and forwards it to the live FastAPI reviews resume endpoint.
- `GET /api/tasks/[taskId]`: returns mock task detail for the current task review shell.
- `GET /api/tasks/[taskId]/events`: returns a mock-labeled execution timeline for the selected task.

## Notes

- The Next.js app is the new operator frontend under migration.
- Streamlit remains available as the legacy operator UI while the new frontend finishes backend parity.
