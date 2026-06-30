# Store AI Clinic Next.js Agent Redesign Spec

## 1. Objective

Refactor the current Streamlit-based Store AI Clinic frontend into a modern Next.js application that feels like a collaborative AI analyst workspace instead of a traditional admin dashboard.

The new product should make the user feel like they are working with an agent that can ingest files, reason over store performance, surface diagnosis progress, ask for confirmation when needed, and deliver actionable results in a focused task-centric interface.

This redesign replaces the six Streamlit workbench pages with a new product information architecture:

- Agent
- Tasks
- Brands
- Knowledge
- Settings

## 2. Product Direction

### 2.1 Experience shift

The current Streamlit UI is organized like an operator console:

- page-based navigation
- dense task presentation
- dashboard-first structure
- form and table heavy interactions

The new UI should be organized like an AI workspace:

- conversation-first entry
- task-centric secondary navigation
- progress and timeline driven feedback
- rich diagnosis panels instead of dashboard blocks
- lightweight configuration surfaces that support the agent instead of competing with it

### 2.2 Delivery mode

This redesign will follow a `Full shell from day one` strategy.

That means the first Next.js release should include all five destination surfaces:

- `Agent`
- `Tasks`
- `Brands`
- `Knowledge`
- `Settings`

The first release should feel like a coherent product shell, not a partial prototype with only one finished page.

### 2.3 Data strategy

The frontend architecture will follow a hybrid integration model:

- `Agent` and `Tasks` should be designed around real FastAPI-backed contracts from the beginning
- `Brands`, `Knowledge`, and `Settings` may use typed adapters or mock-backed domain services temporarily when backend contracts are incomplete

This keeps the primary diagnosis workflow real while allowing the rest of the shell to ship with stable structure and interaction patterns.

## 3. Design Principles

The new interface should follow the product design language of ChatGPT, Claude, Linear, and Notion without copying any one surface literally.

### 3.1 Interface principles

- Minimal: the user should not see unnecessary panels, metrics, or chrome
- Spacious: preserve breathing room and clear grouping
- Focused: each page should prioritize one primary job
- Conversational: the product should speak in task progress, confirmations, summaries, and result blocks
- Task-centric: users should move from input to execution to understanding, not from widget to widget

### 3.2 Explicit anti-goals

The redesign should avoid:

- dense dashboard grids
- nested cards as the default layout strategy
- table-heavy primary experiences
- multi-panel clutter with unclear hierarchy
- vanity metrics that do not help the diagnosis workflow

### 3.3 Preferred UI patterns

The redesign should prefer:

- timelines
- execution steps
- conversation blocks
- expandable sections
- lightweight panels
- right-side contextual detail panes
- task summaries with clear next actions

## 4. Technical Direction

### 4.1 Required stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- Framer Motion
- React Dropzone
- ECharts
- Vercel AI SDK

### 4.2 Architectural style

The new frontend should be built as a product application, not as a static redesign exercise.

The codebase should use:

- route-group based app shell composition
- feature-oriented frontend modules
- typed domain entities and mappers
- store-per-domain state ownership
- a lightweight BFF layer in Next.js route handlers for browser-safe API consumption where useful
- consistent UI primitives and semantic tokens

## 5. Information Architecture

### 5.1 Primary navigation

The top-level application navigation should be:

- `/agent`
- `/tasks`
- `/brands`
- `/knowledge`
- `/settings`

`/agent` should be the default landing page after login or app entry.

### 5.2 Page responsibilities

#### Agent

Primary entry point of the system.

Responsibilities:

- ask analysis questions
- upload daily reports
- upload weekly reports
- trigger diagnosis workflows
- view live execution updates
- respond to human confirmation requests
- read result summaries

#### Tasks

Secondary workbench for reviewing diagnosis runs and operational trace.

Responsibilities:

- browse all diagnosis tasks
- inspect task execution progress
- read task event history
- review diagnosis output in depth
- compare evidence, causes, and action plans

#### Brands

Operational configuration surface for brand-level setup.

Responsibilities:

- manage brand profile
- manage templates
- manage field mappings
- manage diagnosis rules

#### Knowledge

Knowledge operations surface for the agent.

Responsibilities:

- upload SOPs
- upload business rules
- upload historical cases
- monitor RAG preparation status

#### Settings

System-level configuration surface.

Responsibilities:

- AI model configuration
- upload and processing limits
- notifications
- permissions
- environment level system controls

## 6. Route Structure

### 6.1 User-facing routes

```text
/agent
/tasks
/tasks/[taskId]
/brands
/brands/[brandId]
/knowledge
/settings
```

### 6.2 Internal application routes

The Next.js application should also expose internal route handlers that support the frontend experience.

Proposed BFF-oriented routes:

```text
/api/agent/run
/api/agent/upload
/api/agent/confirm
/api/tasks/[taskId]
/api/tasks/[taskId]/events
/api/brands
/api/knowledge
/api/settings
```

These routes exist to:

- normalize browser-facing data contracts
- handle uploads cleanly
- support streaming or event polling patterns
- isolate frontend code from raw FastAPI shapes where needed

## 7. Layout Model

### 7.1 Global shell

The application should use a restrained product shell with:

- a left sidebar for top-level navigation and recent task shortcuts
- a central content workspace
- an optional right-side contextual panel on larger breakpoints

### 7.2 Page hierarchy rules

- The left sidebar owns app navigation and recent context
- The center column owns the primary job of the page
- The right contextual area owns supporting information, not competing primary flows

### 7.3 Responsive behavior

#### Desktop

- left sidebar visible
- center workspace persistent
- right context panel available where useful

#### Tablet

- left sidebar remains visible or compact
- right context panel collapses into tabs, sheet, or inline sections

#### Mobile

- left navigation moves into a drawer
- `Agent` keeps a fixed bottom composer
- `Tasks` shifts from two-column detail to stacked task and detail flow
- context panels become expandable sections

## 8. Page Wireframes

### 8.1 Agent page

The `Agent` page should be modeled as a collaborative analyst workspace.

#### Primary layout

- Left: compact nav and recent tasks
- Center: conversation and execution surface
- Right: current task context, uploaded files, and summary

#### Main blocks

- welcome prompt or empty state
- conversation thread
- upload chips and task mode controls
- composer with text input, upload trigger, and submit action
- execution timeline
- human confirmation cards
- result summary panel

#### Supported actions

- upload daily report
- upload weekly report
- ask freeform analysis question
- create diagnosis task
- confirm or reject human intervention requests
- review final agent summary

### 8.2 Tasks page

The `Tasks` page should be execution-centric, not dashboard-centric.

#### Desktop layout

- Left column: task list timeline and execution logs
- Right column: diagnosis result details

#### Left column content

- search
- filters
- task timeline list
- task execution logs

#### Right column content

- diagnosis title and status
- KPI anomaly visualizations
- evidence summary
- root causes
- suggested actions
- human review history
- result version diff where available

### 8.3 Brands page

The `Brands` page should use tab-based organization rather than subpage sprawl.

Tabs:

- `Profile`
- `Templates`
- `Field Mapping`
- `Diagnosis Rules`

Each tab should feel like a focused editor, not a multi-card dashboard.

### 8.4 Knowledge page

The `Knowledge` page should use a source management layout.

Recommended structure:

- Left: knowledge source types and uploaded file list
- Right: source detail, processing status, indexing readiness, and coverage indicators

### 8.5 Settings page

The `Settings` page should stay minimal and grouped by system concern.

Sections:

- `Model & AI`
- `Uploads`
- `Notifications`
- `Permissions`
- `Environment`

## 9. Component Architecture

The frontend should be organized into focused feature modules.

### 9.1 App shell

- `app/(workspace)/layout.tsx`
- sidebar
- mobile navigation drawer
- page header
- command or quick action entry points

### 9.2 Agent feature module

Core components:

- `agent-shell`
- `message-list`
- `composer`
- `upload-dropzone`
- `execution-timeline`
- `human-confirmation-card`
- `result-summary`

### 9.3 Tasks feature module

Core components:

- `tasks-shell`
- `task-list`
- `task-filters`
- `task-timeline`
- `execution-log-panel`
- `diagnosis-panel`
- `anomalies-chart`
- `root-cause-list`
- `action-plan-list`

### 9.4 Brands feature module

Core components:

- `brands-shell`
- `brand-switcher`
- `brand-profile-form`
- `templates-tab`
- `field-mapping-tab`
- `rules-tab`

### 9.5 Knowledge feature module

Core components:

- `knowledge-shell`
- `source-upload-panel`
- `source-list`
- `rag-status-panel`

### 9.6 Settings feature module

Core components:

- `settings-shell`
- `model-settings-form`
- `upload-settings-form`
- `notification-settings-form`

## 10. State Architecture

Zustand should be split by responsibility instead of using one global monolithic store.

### 10.1 `useWorkspaceStore`

Owns:

- current nav context
- sidebar visibility
- mobile drawer state
- selected brand
- global command palette state

### 10.2 `useAgentSessionStore`

Owns:

- current conversation messages
- draft input text
- uploaded file queue
- active diagnosis run
- timeline events
- human confirmation state
- streaming state
- result summary state

### 10.3 `useTasksStore`

Owns:

- task filters
- selected task id
- task list data
- task detail cache
- execution log state
- expanded result sections

### 10.4 `useBrandsStore`

Owns:

- selected brand
- active tab
- draft template data
- field mapping edits
- diagnosis rules edits
- dirty state tracking

### 10.5 `useKnowledgeStore`

Owns:

- upload queue
- source list
- indexing state
- RAG preparation progress

## 11. Domain and Data Boundaries

### 11.1 Entity-first typing

Each domain should define:

- transport DTOs
- frontend view models
- mappers between them

This avoids leaking raw API response shapes directly into components.

### 11.2 Integration rules

- `Agent` and `Tasks` should align early with real backend contracts
- `Brands`, `Knowledge`, and `Settings` may use typed adapters until backend APIs stabilize
- components consume view models, not raw transport payloads

### 11.3 Streaming and progress

The `Agent` experience must support live progress updates.

This can be implemented using:

- Vercel AI SDK for message and generation orchestration
- server event streams or polling adapters for diagnosis progress
- a timeline event mapper that converts backend workflow events into UI-friendly steps

## 12. Visual System Direction

### 12.1 Style

The visual direction should be restrained and product-native:

- neutral surfaces
- soft shadows used sparingly
- rounded corners
- consistent spacing
- subtle contrast between app shell and content layers

### 12.2 Tone

The interface should feel:

- calm
- precise
- trustworthy
- operational

It should not feel:

- decorative
- marketing heavy
- analytics noisy
- experimental for its own sake

### 12.3 Typography

Use a familiar product UI sans serif with a restrained scale.

Typography should prioritize:

- legibility
- stable hierarchy
- strong label consistency
- compact but not cramped task reading

### 12.4 Motion

Framer Motion should be used only for:

- task state transitions
- timeline event arrival
- panel expansion and collapse
- upload and confirmation feedback

Avoid ornamental page-load choreography.

## 13. shadcn/ui Mapping

Recommended primitive mapping:

### Shell and navigation

- `Sidebar`
- `Sheet`
- `Tabs`
- `ScrollArea`
- `Separator`

### Inputs and commands

- `Textarea`
- `Input`
- `Button`
- `DropdownMenu`
- `Tooltip`

### Progressive disclosure

- `Accordion`
- `Collapsible`

### High-attention interactions

- `Dialog` only for high-risk confirmations

### Structured editing

- `Table` only for limited config surfaces such as field mapping

### Feedback and status

- `Badge`
- `Alert`
- `Skeleton`

## 14. Migration Mapping from Streamlit

The current Streamlit pages should not be reproduced one-to-one in Next.js.

Instead, their responsibilities should be redistributed:

### `01 Dashboard`

Do not preserve as a dedicated destination.

Any useful summary content should be absorbed into:

- `Agent` contextual guidance
- `Tasks` overview summaries

### `02 Brand Onboarding`

Migrate into:

- `Brands > Profile`
- `Brands > Templates`
- `Brands > Field Mapping`

### `03 Batch Upload`

Split between:

- `Agent` for report uploads tied to diagnosis intent
- `Brands` where upload templates or mapping dependencies belong

### `04 Task Overview`

Split between:

- `Agent` for triggering and observing active diagnosis
- `Tasks` for browsing and reviewing tasks

### `05 Human Review`

Migrate into:

- `Agent` as inline confirmation requests during execution
- `Tasks/[taskId]` as persistent review history

### `06 Closure`

Migrate into:

- `Tasks/[taskId]` as result summary, evidence, actions, and diffs

## 15. Suggested File Structure

```text
store-ai-clinic-web/
  app/
    (workspace)/
      layout.tsx
      agent/page.tsx
      tasks/page.tsx
      tasks/[taskId]/page.tsx
      brands/page.tsx
      brands/[brandId]/page.tsx
      knowledge/page.tsx
      settings/page.tsx
    api/
      agent/run/route.ts
      agent/upload/route.ts
      agent/confirm/route.ts
      tasks/[taskId]/route.ts
      tasks/[taskId]/events/route.ts
      brands/route.ts
      knowledge/route.ts
      settings/route.ts
    globals.css
    layout.tsx
    providers.tsx

  features/
    agent/
    tasks/
    brands/
    knowledge/
    settings/

  entities/
    agent/
    tasks/
    brands/
    knowledge/
    settings/

  shared/
    api/
    config/
    hooks/
    lib/
    store/
    ui/

  components/
    ui/

  styles/
    tokens.css
    theme.css
```

## 16. Implementation Phasing

### Phase 0: Frontend foundation

- initialize Next.js application
- install required stack
- define tokens, layout shell, navigation, and providers

### Phase 1: Agent and Tasks workflow

- build `Agent` page
- build `Tasks` page and task detail route
- connect diagnosis and task review flow to real backend contracts

### Phase 2: Brands configuration migration

- migrate onboarding, templates, mappings, and rules into `Brands`

### Phase 3: Knowledge surface

- build knowledge uploads and indexing status experiences

### Phase 4: Settings and Streamlit retirement

- complete settings surface
- keep Streamlit as temporary fallback during validation
- remove or deprecate legacy frontend entry once parity is proven

## 17. Success Criteria

The redesign is successful when:

- the primary user journey starts in `Agent`, not a dashboard
- diagnosis tasks can be created, tracked, and reviewed without visiting Streamlit
- human confirmation appears inline as part of agent collaboration
- the `Tasks` page gives a coherent execution and result review experience
- `Brands`, `Knowledge`, and `Settings` feel like part of the same product shell
- the product feels focused and modern rather than admin-heavy

## 18. Non-goals for the first redesign pass

The first redesign pass should not attempt to:

- redesign backend domain models
- replace the diagnosis workflow engine itself
- invent a separate analytics dashboard product
- overbuild rich visualization where simple summary is enough
- create a bespoke design language unrelated to proven product UI patterns

## 19. Open implementation assumptions

The following assumptions are intentionally fixed for implementation clarity:

- `Agent` is the default product entry point
- `/tasks/[taskId]` remains a dedicated detail route
- `Agent` and `Tasks` are real-data first
- `Brands`, `Knowledge`, and `Settings` may temporarily rely on typed adapters
- the legacy Streamlit frontend remains available during migration rather than being removed immediately
