# Conversation Evidence Visibility Design

Date: 2026-06-14

## Goal

Make attached file evidence visible in the conversation workspace before and after send, so operators can see which materials informed the current analysis turn.

## Problem

The conversation composer now supports file upload again, but attached files are still mostly implicit. Users can select files before sending, yet after submission the conversation thread does not visibly preserve which files were attached to that turn.

## Chosen Approach

Keep the existing composer pre-send file chips and add a post-send evidence card under the user message that used those files.

This uses frontend-local message metadata only. It does not require backend schema changes or attachment persistence.

## Scope

### In scope

1. Preserve current pre-send selected file chips in the composer.
2. Add a lightweight evidence card under a user message when that turn included uploaded files.
3. Show file name, type, and size in the evidence card.
4. Keep evidence visible for the current in-memory conversation session after successful send.

### Out of scope

1. Downloading attachments.
2. Persisting evidence cards across full page refresh.
3. Backfilling evidence for historical messages loaded from backend DTOs.
4. Real attachment storage or evidence linking APIs.

## Data Model

Extend the frontend `ConversationMessage` type with an optional local-only `evidenceFiles` field.

Messages mapped from backend DTOs will continue to omit this field. Locally appended user messages can attach structured evidence metadata after upload summarization succeeds.

## UI Design

### Before send

No major change. The composer already shows selected file chips as confirmation for the current turn.

### After send

If a user message includes evidence files, render a compact “本轮附带资料” card directly below that message text. The card should:

1. Match the calm existing workspace style.
2. Read as supporting evidence, not as a second message bubble.
3. Stay visually subordinate to the actual user question text.

## Rendering Rules

1. Only user messages can show this evidence card.
2. Only render the card when `evidenceFiles` exists and is non-empty.
3. Assistant messages remain unchanged.
4. Empty or backend-hydrated messages without evidence metadata render exactly as before.

## Testing

Add or update tests for:

1. Rendering an evidence card for a locally appended user message with files.
2. Preserving normal rendering for user messages without evidence.
3. Confirming the attachment-aware send flow now renders both the assistant response and the user evidence trail.

## Success Criteria

This work is successful when:

1. Users can see selected files before sending.
2. After sending, the resulting user turn visibly shows which files were attached.
3. The change does not require backend API changes.
