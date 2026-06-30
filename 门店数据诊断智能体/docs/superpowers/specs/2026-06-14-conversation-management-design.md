# Conversation Management Design

Date: 2026-06-14

## Goal

Upgrade the Next.js conversation workspace so session management feels closer to ChatGPT and Claude.

Operators should be able to create, rename, delete, and recover from empty-state workflows without breaking the current conversation-first diagnosis experience.

## Problem

The current conversation workspace already supports:

1. Session list rendering
2. Conversation thread
3. Historical references

But session management is still incomplete:

1. New sessions are created implicitly on first send instead of being an explicit user action
2. Sessions cannot be renamed
3. Sessions cannot be deleted
4. Empty state is still a passive placeholder instead of a guided starting point
5. Session titles are still tied too directly to raw first-question text

This makes the product feel closer to a technical prototype than a polished AI workspace.

## Chosen Approach

Use a hybrid state model:

1. TanStack Query manages remote conversation data and mutations
2. Zustand continues to manage local UI state such as active session, composer draft, selected files, and dialog state

This is a deliberate incremental upgrade rather than a full conversation architecture rewrite.

## Scope

### In scope

1. Add explicit `+ 新建会话` creation flow
2. Add per-session rename and delete actions
3. Add confirm dialog for creating a new session when there is unsent local content
4. Add delete confirmation dialog
5. Add auto-generated session titles based on the first user question
6. Add inline rename editing with `Enter`, `Esc`, and blur behavior
7. Add a conversation empty state with a first-session CTA
8. Add frontend BFF CRUD routes under `/api/conversations`
9. Add backend CRUD routes for conversation session management
10. Add backend title generation rules and title ownership protection

### Out of scope

1. Conversation archive
2. Session search
3. Multi-folder or grouped session organization
4. Soft delete or recycle bin
5. LLM-generated title summarization
6. Full migration of all conversation state to TanStack Query

## Product Rules

### Unsaved content

For this iteration, "unsaved content" means:

1. Non-empty composer draft text
2. Locally selected files that have not been sent

It does not include:

1. Existing sent messages
2. An already opened but untouched blank session

### When confirmation is required

Only explicit new-session creation is blocked by the unsaved-content confirmation.

Switching between existing sessions does not show a draft-loss confirmation in this iteration. This keeps the workspace closer to ChatGPT and Claude and avoids excessive interruption.

## Information Architecture

### Route behavior

1. `/agent` remains the entry page and empty-state container
2. `/agent/[sessionId]` remains the persistent conversation route
3. Creating or selecting a session should navigate to `/agent/[sessionId]`
4. Deleting the active session should:
   - navigate to the most recently active remaining session when one exists
   - navigate back to `/agent` when none remain

### Workspace layout

Keep the current three-column workspace:

1. Left: conversation sidebar
2. Center: thread and composer
3. Right: references and follow-up support

Only the left column and empty center state change substantially in this iteration.

## Component Design

### `ConversationSidebar`

Replace the current `SessionListPanel` with a richer sidebar component that owns:

1. Sidebar header
2. `CreateConversationButton`
3. Session list rendering
4. Empty-list placeholder for the sidebar itself

### `ConversationItem`

Each session row should support:

1. Default display mode
2. Active selected styling
3. Inline rename mode
4. Overflow action trigger

Displayed information:

1. Session title
2. Optional store label or recent activity helper text

### `ConversationMenu`

Menu items:

1. `重命名`
2. `删除`

The menu should remain lightweight and contextual rather than introducing a full settings surface.

### `CreateConversationButton`

Display:

1. Label: `+ 新建会话`

Behavior:

1. If unsaved content exists, open confirmation dialog
2. Otherwise create a new session immediately

### `DeleteConversationDialog`

Display:

1. Title: `确认删除该会话？`
2. Description: `删除后无法恢复。`
3. Buttons: `取消` and `删除`

### `ConversationEmptyState`

When there are no sessions and no active thread content, render a welcome panel in the main workspace:

1. Title: `欢迎使用门店AI分析助手`
2. Intro: `你可以上传日报、上传周报、提出经营问题，获取诊断建议。`
3. Capability bullets:
   - `上传日报`
   - `上传周报`
   - `提出经营问题`
   - `获取诊断建议`
4. Primary CTA: `创建第一个诊断会话`

## Interaction Design

### New conversation

Primary flow:

1. User clicks `+ 新建会话`
2. If `composerDraft.trim()` is non-empty or `selectedFiles.length > 0`, open confirmation dialog
3. If user confirms, call create API
4. On success:
   - prepend the new session in the sidebar list
   - set the new session active
   - clear local composer draft, selected files, suggestions, and upload error
   - navigate to `/agent/[sessionId]`
5. The new session opens as an intentionally blank diagnosis workspace

### Delete conversation

1. User opens `⋮`
2. User chooses `删除`
3. Confirmation dialog opens
4. On confirm, call delete API
5. On success:
   - refresh or optimistically update the session list
   - if the deleted session was not active, only remove it from the list
   - if the deleted session was active:
     - switch to the most recent remaining session
     - or go to `/agent` empty state if none remain

### Rename conversation

1. User opens `⋮`
2. User chooses `重命名`
3. The title switches to inline input mode
4. Input behavior:
   - `Enter` saves
   - `Esc` cancels
   - blur saves
5. If the value is empty after trim, restore the original title and exit edit mode
6. If the value is unchanged, exit edit mode without mutation

### Switching sessions

1. Clicking a session row changes the active session
2. The route updates to `/agent/[sessionId]`
3. No unsaved-content confirmation is shown during session switching in this iteration

## State Model

### TanStack Query responsibilities

TanStack Query becomes the source of truth for remote conversation data:

1. Session list loading
2. Session creation
3. Session rename
4. Session deletion
5. Session detail refresh when needed
6. Message history loading, if migrated in this iteration

Recommended query keys:

1. `["conversations", { storeId }]`
2. `["conversation", sessionId]`
3. `["conversationMessages", sessionId]`

### Zustand responsibilities

Zustand remains responsible for local-only UI state:

1. `activeSessionId`
2. `composerDraft`
3. `selectedFiles`
4. `suggestions`
5. `uploadError`
6. dialog and inline editing state

Suggested additions:

1. `pendingCreateConfirm: boolean`
2. `deleteTargetSessionId: string | null`
3. `renamingSessionId: string | null`

This keeps remote cache and transient UI concerns from getting mixed together.

## API Design

### Frontend BFF routes

Add new Next.js route handlers:

1. `GET /api/conversations`
2. `POST /api/conversations`
3. `PATCH /api/conversations/[id]`
4. `DELETE /api/conversations/[id]`

Keep existing message routes in place:

1. `GET /api/conversations/sessions/[id]/messages`
2. `POST /api/conversations/sessions/[id]/messages`

This gives the frontend a clean CRUD surface without forcing a risky message API rename in the same iteration.

### Backend routes

Add matching FastAPI routes:

1. `GET /api/conversations`
2. `POST /api/conversations`
3. `PATCH /api/conversations/{session_id}`
4. `DELETE /api/conversations/{session_id}`

Short-term compatibility is acceptable:

1. existing `/api/conversations/sessions` routes may remain available
2. new frontend code should prefer the shorter `/api/conversations` CRUD endpoints

### Request and response shapes

#### `GET /api/conversations`

Returns a list of conversation summaries.

#### `POST /api/conversations`

Request fields:

1. `brand_id`
2. `store_id`
3. `entry_mode`
4. `initial_question?`
5. `session_title?`

Rules:

1. If `session_title` is present, use it directly
2. Otherwise if `initial_question` is present, generate title from that question
3. Otherwise use the default title `新诊断会话`

Returns the full conversation summary.

#### `PATCH /api/conversations/{id}`

Request fields:

1. `session_title`

Returns the updated conversation summary.

#### `DELETE /api/conversations/{id}`

Returns `204 No Content`.

## Database Design

### Existing table reuse

Reuse the existing `agent_sessions` table as the conversation session table.

No new top-level session table is required.

### New field

Add:

1. `title_source`

Allowed values:

1. `system`
2. `user`

Purpose:

1. allow auto-generated titles for system-owned titles
2. protect manually renamed titles from later automatic overwrite

### Deletion semantics

Deleting a conversation should remove dependent conversation-only data:

1. `agent_messages`
2. `session_memory_snapshots`
3. `followup_suggestions`
4. `message_diagnosis_links`

For `diagnosis_memory_cards.session_id`, use `SET NULL` rather than hard-delete so historical diagnosis artifacts can survive session deletion.

### Migration notes

The current project still initializes schema via `Base.metadata.create_all(...)` in multiple environments, so model changes can land without depending entirely on migrations.

However, if Alembic is already in use for deployment environments, add a migration for:

1. `agent_sessions.title_source`
2. foreign key delete behavior updates where needed

## Title Generation Rules

### When title generation happens

Auto-title generation applies only when:

1. the user did not provide a manual title
2. the title is still system-owned

### Blank-session creation

If a session is created through `+ 新建会话` without an initial question, create it as:

1. `session_title = "新诊断会话"`
2. `title_source = "system"`

### First-message upgrade

When the first user message arrives:

1. if the current title is still the default system title
2. and `title_source = "system"`
3. update the title from the first message

If the user has already manually renamed the conversation:

1. keep the existing title
2. do not overwrite it

### Rule-based title generation

Prefer deterministic rules over LLM-based title generation.

Suggested rules:

1. If the question contains `比较` or `对比` and clearly references multiple stores:
   - `门店经营对比分析`
2. If the question references a store and `日报`:
   - `{门店名}日报诊断`
3. If the question references a store and `周报`:
   - `{门店名}周报诊断`
4. If the question references a single store and asks for analysis or diagnosis:
   - `{门店名}经营诊断`
5. Otherwise:
   - generate a short semantic summary based on the first question

### Length rule

1. Maximum length: 20 Chinese characters
2. If a generated title is too long, preserve the core noun phrase and truncate

### Fallback

If generation fails:

1. use `新诊断会话`
2. do not block conversation creation

## Error Handling

### Create session failure

1. Show `创建会话失败，请稍后重试`
2. Preserve draft and selected files

### Rename failure

1. Revert to original title
2. Show `重命名失败，请稍后重试`

### Delete failure

1. Show `删除失败，请稍后重试`
2. Keep current list and active selection unchanged

### Session list load failure

1. Show a lightweight sidebar error state
2. Provide retry action
3. Keep current thread readable if already loaded

### Title generation failure

1. Fall back to `新诊断会话`
2. Do not block creation or first-message send

## Testing

### Frontend unit tests

Add or expand tests for:

1. sidebar empty state rendering
2. active session highlighting
3. create button confirmation when draft content exists
4. inline rename with `Enter`
5. inline rename cancel with `Esc`
6. blur-save rename behavior
7. delete confirmation flow
8. deleting active session fallback routing

### Frontend route tests

Expand conversation BFF tests for:

1. `GET /api/conversations`
2. `POST /api/conversations`
3. `PATCH /api/conversations/[id]`
4. `DELETE /api/conversations/[id]`

### Backend unit tests

Add tests for:

1. system title creation
2. first-message auto-title upgrade
3. manual rename setting `title_source = "user"`
4. subsequent messages not overwriting user titles
5. delete behavior and dependent data handling

### Backend integration tests

Add tests for:

1. creating a blank session
2. creating a session from initial question
3. renaming a session
4. deleting a session
5. deleting the active session and reloading list behavior

## Implementation Order

1. Add backend CRUD service methods and title-generation rules
2. Add backend CRUD API routes under `/api/conversations`
3. Add Next.js BFF CRUD routes
4. Add `QueryClientProvider` in `app/providers.tsx`
5. Build sidebar, item, menu, create button, delete dialog, and empty-state components
6. Wire create, rename, and delete mutations
7. Update first-message send flow so a default blank session can upgrade its title after the first user turn
8. Add tests and run regression checks for existing conversation pages

## Success Criteria

This work is successful when:

1. Users can explicitly create a blank new conversation
2. Users can rename any conversation inline
3. Users can delete a conversation safely
4. Deleting the active conversation moves the workspace to a valid next state
5. First-question titles are concise, product-appropriate, and capped at 20 characters
6. Manual titles are never overwritten by automatic title generation
7. The workspace still preserves the current conversation-first diagnosis flow
