"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  mapConversationSessionSummaries,
  mapConversationSessionSummary,
} from "@/entities/conversations/mappers";
import type {
  ConversationEntryMode,
  ConversationSessionStatus,
  ConversationSessionSummary,
  ConversationSessionSummaryDto,
  ConversationTitleSource,
  CreateConversationRequestDto,
  UpdateConversationRequestDto,
} from "@/entities/conversations/types";

type ConversationBaseDto = {
  session_id?: string;
  session_title?: string;
  status?: ConversationSessionStatus;
  entry_mode?: ConversationEntryMode;
  brand_id?: string;
  store_id?: string;
  title_source?: ConversationTitleSource;
  titleSource?: ConversationTitleSource;
};

type ConversationListQueryDto = ConversationBaseDto & {
  id?: string;
  title?: string;
};

type CreateConversationResponseDto = ConversationSessionSummaryDto | ConversationBaseDto;

export const conversationKeys = {
  all: ["conversations"] as const,
  list: (storeId?: string) =>
    [...conversationKeys.all, { storeId: storeId ?? null }] as const,
};

function normalizeConversationSummaryDto(
  dto: ConversationListQueryDto,
): ConversationSessionSummaryDto {
  const sessionId = dto.session_id ?? dto.id;
  const sessionTitle = dto.session_title ?? dto.title;
  const storeId = dto.store_id;
  const status = dto.status;

  if (
    !sessionId ||
    !sessionTitle ||
    !storeId ||
    !status ||
    !sessionId.trim() ||
    !sessionTitle.trim() ||
    !storeId.trim()
  ) {
    throw new Error("Invalid conversation payload.");
  }

  return {
    session_id: sessionId.trim(),
    session_title: sessionTitle.trim(),
    title_source: dto.title_source ?? dto.titleSource ?? "system",
    status,
    entry_mode: dto.entry_mode ?? "manual",
    brand_id: dto.brand_id?.trim() ?? "",
    store_id: storeId.trim(),
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: string };
    return typeof data.detail === "string" && data.detail.trim()
      ? data.detail
      : fallback;
  } catch {
    return fallback;
  }
}

async function fetchConversations(storeId?: string) {
  const search = storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
  const response = await fetch(`/api/conversations${search}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to load conversations."),
    );
  }

  const data = (await response.json()) as ConversationListQueryDto[];
  return mapConversationSessionSummaries(
    data.map(normalizeConversationSummaryDto),
  );
}

async function createConversation(
  payload: CreateConversationRequestDto,
): Promise<ConversationSessionSummary> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to create the conversation."),
    );
  }

  const data = (await response.json()) as CreateConversationResponseDto;
  return mapConversationSessionSummary(normalizeConversationSummaryDto(data));
}

async function updateConversation(
  sessionId: string,
  payload: UpdateConversationRequestDto,
): Promise<ConversationSessionSummary> {
  const response = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to rename the conversation."),
    );
  }

  const data = (await response.json()) as CreateConversationResponseDto;
  return mapConversationSessionSummary(normalizeConversationSummaryDto(data));
}

async function deleteConversation(sessionId: string): Promise<void> {
  const response = await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to delete the conversation."),
    );
  }
}

export function useConversationsQuery(storeId?: string) {
  return useQuery({
    queryKey: conversationKeys.list(storeId),
    queryFn: () => fetchConversations(storeId),
    retry: false,
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useRenameConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      sessionTitle,
    }: {
      sessionId: string;
      sessionTitle: string;
    }) => updateConversation(sessionId, { session_title: sessionTitle }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteConversation(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
    },
  });
}
