import { describe, expect, it } from "vitest";

import type {
  ConversationFollowupSuggestion,
  ConversationMessage,
  ConversationSessionSummary,
} from "@/entities/conversations/types";
import { createConversationListStore } from "@/shared/store/conversation-list-store";
import { createConversationRuntimeStore } from "@/shared/store/conversation-runtime-store";
import { createConversationThreadStore } from "@/shared/store/conversation-thread-store";

describe("conversation list store", () => {
  it("replaces the current session summaries", () => {
    const store = createConversationListStore();
    const sessions: ConversationSessionSummary[] = [
      {
        sessionId: "ses_001",
        sessionTitle: "Hangzhou West Lake Store Analysis",
        storeId: "hangzhou-xihu",
        status: "active",
      },
    ];

    store.getState().replaceSessions(sessions);

    expect(store.getState().sessions).toEqual(sessions);
  });
});

describe("conversation thread store", () => {
  it("appends messages after replacing the thread", () => {
    const store = createConversationThreadStore();
    const existing: ConversationMessage = {
      messageId: "msg_001",
      role: "assistant",
      messageType: "answer",
      contentText: "Revenue is down 12%.",
    };
    const appended: ConversationMessage = {
      messageId: "msg_002",
      role: "assistant",
      messageType: "answer",
      contentText: "Traffic is down 8%.",
    };

    store.getState().replaceMessages([existing]);
    store.getState().appendMessage(appended);

    expect(store.getState().messages).toEqual([existing, appended]);
  });
});

describe("conversation runtime store", () => {
  it("tracks the active session and follow-up suggestions", () => {
    const store = createConversationRuntimeStore();
    const suggestions: ConversationFollowupSuggestion[] = [
      {
        intent: "time_drilldown",
        text: "Check which hours declined the most",
        suggestionType: "deepen",
      },
    ];

    store.getState().setActiveSessionId("ses_001");
    store.getState().replaceSuggestions(suggestions);
    store.getState().setComposerDraft("Why did it drop?");

    expect(store.getState().activeSessionId).toBe("ses_001");
    expect(store.getState().suggestions).toEqual(suggestions);
    expect(store.getState().composerDraft).toBe("Why did it drop?");
  });

  it("tracks selected files and clears them independently from the draft", () => {
    const store = createConversationRuntimeStore();
    const file = new File(["daily metrics"], "daily-report.csv", {
      type: "text/csv",
    });

    store.getState().setSelectedFiles([file]);
    store.getState().setUploadError("Upload failed");
    store.getState().clearSelectedFiles();

    expect(store.getState().selectedFiles).toEqual([]);
    expect(store.getState().uploadError).toBeNull();
  });

  it("tracks pending create confirmation, delete target, and renaming session state", () => {
    const store = createConversationRuntimeStore();

    store.getState().setPendingCreateConfirm(true);
    store.getState().setDeleteTargetSessionId("ses_001");
    store.getState().setRenamingSessionId("ses_002");

    expect(store.getState().pendingCreateConfirm).toBe(true);
    expect(store.getState().deleteTargetSessionId).toBe("ses_001");
    expect(store.getState().renamingSessionId).toBe("ses_002");
  });
});
