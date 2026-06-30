"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  mapConversationCitations,
  mapConversationFollowupSuggestions,
  mapConversationMessages,
  mapConversationSessionSummary,
} from "@/entities/conversations/mappers";
import {
  formatAttachmentSummaryLine,
  localizeAssistantReply,
} from "@/entities/conversations/localization";
import type {
  ConversationEvidenceFile,
  ConversationFollowupSuggestion,
  ConversationMessage,
  ConversationMessageDto,
  ConversationSessionSummaryDto,
  PostConversationMessageResponseDto,
} from "@/entities/conversations/types";
import { useConversationListStore } from "@/shared/store/conversation-list-store";
import { useConversationRuntimeStore } from "@/shared/store/conversation-runtime-store";
import { useConversationThreadStore } from "@/shared/store/conversation-thread-store";

type UseConversationThreadOptions = {
  sessionId: string | null;
  initialMessages?: ConversationMessage[];
  initialSuggestions?: ConversationFollowupSuggestion[];
};

type UploadSummaryResponse = {
  files: Array<{
    field_name: string;
    last_modified: number;
    name: string;
    size: number;
    type: string;
  }>;
};

const DEFAULT_FILE_ONLY_PROMPT =
  "请结合我刚上传的资料，先总结关键异常，再给出下一步建议。";
const DEFAULT_UPLOAD_ERROR = "无法准备上传资料，请稍后重试。";
const DEFAULT_SESSION_CREATE_ERROR = "创建会话超时，请稍后重试。";
const DEFAULT_MESSAGE_ERROR = "发送消息超时，请稍后重试。";

const DEFAULT_SESSION_BRAND_ID = "brand-acme";
const DEFAULT_SESSION_STORE_ID = "store-ai-clinic-demo";

function createDraftMessageId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function buildAttachmentSummary(uploadResponse: UploadSummaryResponse) {
  return uploadResponse.files
    .map(
      (file) => formatAttachmentSummaryLine(file.name, file.type, file.size),
    )
    .join("\n");
}

function mapUploadSummaryToEvidence(
  uploadResponse: UploadSummaryResponse,
): ConversationEvidenceFile[] {
  return uploadResponse.files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
  }));
}

function extractDetail(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  return null;
}

function isAbortLikeMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("abort") ||
    normalized.includes("aborted") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out")
  );
}

function resolveStageErrorMessage(detail: string | null, fallback: string) {
  if (!detail) {
    return fallback;
  }

  return isAbortLikeMessage(detail) ? fallback : detail;
}

async function summarizeFiles(files: File[]) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch("/api/agent/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as
      | UploadSummaryResponse
      | { detail?: string };

    if (!response.ok || !("files" in data)) {
      throw new Error(
        resolveStageErrorMessage(extractDetail(data), DEFAULT_UPLOAD_ERROR),
      );
    }

    return data;
  } catch (error) {
    throw new Error(
      error instanceof Error && !isAbortLikeMessage(error.message)
        ? error.message
        : DEFAULT_UPLOAD_ERROR,
    );
  }
}

async function createConversationSession(initialQuestion: string) {
  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_id: DEFAULT_SESSION_BRAND_ID,
        store_id: DEFAULT_SESSION_STORE_ID,
        entry_mode: "manual",
        initial_question: initialQuestion,
      }),
    });

    const data = (await response.json()) as
      | ConversationSessionSummaryDto
      | { detail?: string };

    if (!response.ok || !("session_id" in data)) {
      throw new Error(
        resolveStageErrorMessage(
          extractDetail(data),
          DEFAULT_SESSION_CREATE_ERROR,
        ),
      );
    }

    return data;
  } catch (error) {
    throw new Error(
      error instanceof Error && !isAbortLikeMessage(error.message)
        ? error.message
        : DEFAULT_SESSION_CREATE_ERROR,
    );
  }
}

export function useConversationThread({
  sessionId,
  initialMessages = [],
  initialSuggestions = [],
}: UseConversationThreadOptions) {
  const router = useRouter();
  const messages = useConversationThreadStore((state) => state.messages);
  const replaceMessages = useConversationThreadStore(
    (state) => state.replaceMessages,
  );
  const appendMessage = useConversationThreadStore((state) => state.appendMessage);
  const resetMessages = useConversationThreadStore((state) => state.reset);

  const prependSession = useConversationListStore((state) => state.prependSession);

  const suggestions = useConversationRuntimeStore((state) => state.suggestions);
  const replaceSuggestions = useConversationRuntimeStore(
    (state) => state.replaceSuggestions,
  );
  const composerDraft = useConversationRuntimeStore(
    (state) => state.composerDraft,
  );
  const setComposerDraft = useConversationRuntimeStore(
    (state) => state.setComposerDraft,
  );
  const isSubmitting = useConversationRuntimeStore((state) => state.isSubmitting);
  const setIsSubmitting = useConversationRuntimeStore(
    (state) => state.setIsSubmitting,
  );
  const selectedFiles = useConversationRuntimeStore(
    (state) => state.selectedFiles,
  );
  const setSelectedFiles = useConversationRuntimeStore(
    (state) => state.setSelectedFiles,
  );
  const clearSelectedFiles = useConversationRuntimeStore(
    (state) => state.clearSelectedFiles,
  );
  const removeSelectedFile = useConversationRuntimeStore(
    (state) => state.removeSelectedFile,
  );
  const uploadError = useConversationRuntimeStore((state) => state.uploadError);
  const setUploadError = useConversationRuntimeStore(
    (state) => state.setUploadError,
  );
  const activeSessionId = useConversationRuntimeStore(
    (state) => state.activeSessionId,
  );
  const setActiveSessionId = useConversationRuntimeStore(
    (state) => state.setActiveSessionId,
  );
  const resetRuntime = useConversationRuntimeStore((state) => state.resetRuntime);

  const seededRef = useRef(false);
  const skipInitialHistoryLoadRef = useRef(true);

  useEffect(() => {
    seededRef.current = false;
    skipInitialHistoryLoadRef.current = true;
    resetMessages();
    resetRuntime();
  }, [resetMessages, resetRuntime, sessionId]);

  useEffect(() => {
    if (seededRef.current) {
      return;
    }

    replaceMessages(initialMessages);
    replaceSuggestions(initialSuggestions);
    seededRef.current = true;
  }, [initialMessages, initialSuggestions, replaceMessages, replaceSuggestions]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!sessionId) {
        return;
      }

      if (skipInitialHistoryLoadRef.current) {
        skipInitialHistoryLoadRef.current = false;
        return;
      }

      try {
        const response = await fetch(
          `/api/conversations/sessions/${encodeURIComponent(sessionId)}/messages`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ConversationMessageDto[];
        if (cancelled) {
          return;
        }

        replaceMessages(mapConversationMessages(data));
      } catch {
        // Keep the current local thread usable if history loading fails.
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [replaceMessages, sessionId]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed && selectedFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    const normalizedMessage = trimmed || DEFAULT_FILE_ONLY_PROMPT;

    try {
      let targetSessionId = sessionId ?? activeSessionId;

      if (!targetSessionId) {
        const sessionDto = await createConversationSession(normalizedMessage);
        const nextSession = mapConversationSessionSummary(sessionDto);
        prependSession(nextSession);
        setActiveSessionId(nextSession.sessionId);
        targetSessionId = nextSession.sessionId;
        router.push(`/agent/${encodeURIComponent(nextSession.sessionId)}`);
      }

      const uploadSummary =
        selectedFiles.length > 0 ? await summarizeFiles(selectedFiles) : null;
      const evidenceFiles = uploadSummary
        ? mapUploadSummaryToEvidence(uploadSummary)
        : undefined;
      const message = uploadSummary
        ? `${normalizedMessage}\n\n已附带资料：\n${buildAttachmentSummary(uploadSummary)}`
        : normalizedMessage;

      appendMessage({
        messageId: createDraftMessageId("user"),
        role: "user",
        messageType: "question",
        contentText: message,
        evidenceFiles,
      });

      let response: Response;

      try {
        response = await fetch(
          `/api/conversations/sessions/${encodeURIComponent(targetSessionId)}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          },
        );
      } catch {
        throw new Error(DEFAULT_MESSAGE_ERROR);
      }

      const data = (await response.json()) as
        | PostConversationMessageResponseDto
        | { detail?: string };

      if (!response.ok || !("assistant_message" in data)) {
        throw new Error(
          resolveStageErrorMessage(extractDetail(data), DEFAULT_MESSAGE_ERROR),
        );
      }

      appendMessage({
        messageId: createDraftMessageId("assistant"),
        role: "assistant",
        messageType: "answer",
        contentText: localizeAssistantReply(data.assistant_message),
        citations: mapConversationCitations(data.citations),
      });
      replaceSuggestions(
        mapConversationFollowupSuggestions(data.followup_suggestions),
      );
      clearSelectedFiles();
      setComposerDraft("");
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : DEFAULT_MESSAGE_ERROR,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    messages: messages.length > 0 ? messages : initialMessages,
    suggestions: suggestions.length > 0 ? suggestions : initialSuggestions,
    composerDraft,
    setComposerDraft,
    selectedFiles,
    uploadError,
    setSelectedFiles,
    removeSelectedFile,
    setUploadError,
    sendMessage,
    isSubmitting,
    clearDraftArtifacts: () => {
      clearSelectedFiles();
      setComposerDraft("");
      setUploadError(null);
    },
  };
}
