# Conversation Upload Recovery Design

Date: 2026-06-14

## Goal

Restore the missing file upload entry on the Next.js conversation-first `/agent` workspace without rolling the page back to the old upload-first layout.

This change should let store operators attach report files while continuing to use the current persistent conversation workflow.

## Problem

The recent conversation-first upgrade moved `/agent` to `ConversationShell`, but the old upload UI remained in the legacy `AgentShell`.

As a result:

1. The main `/agent` entry no longer exposes file upload.
2. The existing upload BFF route still exists, but users cannot reach it from the conversation workspace.
3. The product experience regressed for users who start diagnosis by attaching daily or weekly reports.

## Chosen Approach

Embed a lightweight upload affordance directly into the current conversation composer area.

This recovery keeps the current three-panel conversation layout and avoids restoring the old standalone upload-first agent page.

## Scope

### In scope

1. Add a file upload area next to the current follow-up composer.
2. Show selected files in the current conversation runtime before send.
3. On send, summarize attached files through the existing `/api/agent/upload` route.
4. Merge the upload summary into the message sent to the conversation message route.
5. Preserve selected files when upload summarization fails so the user can retry.
6. Allow file-only submission by sending a default analysis prompt when no text was entered.

### Out of scope

1. Real backend file persistence.
2. Database-backed attachment history.
3. Rich evidence linking between attachments and later assistant responses.
4. Redesigning the full conversation workspace layout.

## UI Design

The composer remains the primary action area in the middle conversation column.

The upload affordance should appear above or within the composer card as a compact drag-and-drop / button entry, not as a large hero panel. The user should be able to:

1. Click to choose files.
2. Drag files into the composer area.
3. See selected filenames as removable chips before sending.
4. Read a concise hint that files support the current analysis turn.

The interface should stay consistent with the calm, action-oriented product direction from `PRODUCT.md`.

## Data Flow

1. The user selects one or more files in the composer.
2. The client stores those files in conversation runtime state for the current session.
3. When the user submits:
   - if files are present, call `/api/agent/upload` with multipart form data;
   - build a concise attachment summary from the response;
   - combine the user text and attachment summary into the posted conversation message.
4. Send the composed message to `/api/conversations/sessions/[sessionId]/messages`.
5. On success, clear the composer draft and selected files.

If the user submits files without text, the client should send a default prompt asking the assistant to analyze the attached materials.

## Error Handling

1. If upload summarization fails, do not clear selected files.
2. Show a clear composer-level error message that the files could not be prepared for analysis.
3. If conversation send fails after upload summarization succeeds, also keep the selected files so the user can retry.
4. If no session is available, keep the current no-op behavior for message sending.

## Architecture

1. Keep `ConversationShell` as the page-level orchestrator.
2. Extend `ChatComposer` so it can render upload UI and submission errors.
3. Extend the conversation runtime layer to hold selected files and related transient error state.
4. Extend `useConversationThread` to coordinate:
   - file summarization;
   - default prompt generation for file-only sends;
   - clearing files only after successful message post.

This keeps upload behavior aligned with the current conversation state model instead of reusing the legacy `AgentShell` store.

## Testing

Add or update unit tests for:

1. Rendering the upload affordance on `/agent`.
2. Selecting files and showing them in the composer.
3. Sending a message with attached files, including the upload-summary step before conversation post.
4. File-only submission using the default analysis prompt.
5. Preserving selected files when upload summarization fails.

## Success Criteria

This recovery is successful when:

1. `/agent` once again lets users attach files from the main conversation workspace.
2. The conversation-first layout remains intact.
3. Existing conversation route tests still pass.
4. The upload path works through the current mock upload BFF without pretending that persistence exists.
