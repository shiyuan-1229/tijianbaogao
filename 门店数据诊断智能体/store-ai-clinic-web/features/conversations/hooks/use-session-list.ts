"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { ConversationSessionSummary } from "@/entities/conversations/types";
import {
  useConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  useRenameConversationMutation,
} from "@/features/conversations/hooks/use-conversations-query";
import { useConversationListStore } from "@/shared/store/conversation-list-store";
import { useConversationRuntimeStore } from "@/shared/store/conversation-runtime-store";

type UseSessionListOptions = {
  initialActiveSessionId?: string | null;
  initialSessions: ConversationSessionSummary[];
};

type DeleteSessionResult = {
  deletedCurrent: boolean;
  nextSessionId: string | null;
};

const DEFAULT_SESSION_BRAND_ID = "brand-acme";
const DEFAULT_SESSION_STORE_ID = "store-ai-clinic-demo";

export function useSessionList({
  initialActiveSessionId = null,
  initialSessions,
}: UseSessionListOptions) {
  const router = useRouter();

  const sessions = useConversationListStore((state) => state.sessions);
  const prependSession = useConversationListStore((state) => state.prependSession);
  const removeSession = useConversationListStore((state) => state.removeSession);
  const replaceSessions = useConversationListStore((state) => state.replaceSessions);
  const updateSession = useConversationListStore((state) => state.updateSession);

  const activeSessionId = useConversationRuntimeStore(
    (state) => state.activeSessionId,
  );
  const deleteTargetSessionId = useConversationRuntimeStore(
    (state) => state.deleteTargetSessionId,
  );
  const renamingSessionId = useConversationRuntimeStore(
    (state) => state.renamingSessionId,
  );
  const setActiveSessionId = useConversationRuntimeStore(
    (state) => state.setActiveSessionId,
  );
  const setDeleteTargetSessionId = useConversationRuntimeStore(
    (state) => state.setDeleteTargetSessionId,
  );
  const setRenamingSessionId = useConversationRuntimeStore(
    (state) => state.setRenamingSessionId,
  );

  const conversationsQuery = useConversationsQuery();
  const createConversationMutation = useCreateConversationMutation();
  const renameConversationMutation = useRenameConversationMutation();
  const deleteConversationMutation = useDeleteConversationMutation();

  useEffect(() => {
    replaceSessions(initialSessions);
  }, [initialSessions, replaceSessions]);

  useEffect(() => {
    if (conversationsQuery.data) {
      replaceSessions(conversationsQuery.data);
    }
  }, [conversationsQuery.data, replaceSessions]);

  useEffect(() => {
    setActiveSessionId(initialActiveSessionId);
    setDeleteTargetSessionId(null);
    setRenamingSessionId(null);
  }, [
    initialActiveSessionId,
    setActiveSessionId,
    setDeleteTargetSessionId,
    setRenamingSessionId,
  ]);

  useEffect(() => {
    if (activeSessionId) {
      return;
    }

    if (initialActiveSessionId) {
      return;
    }

    if (sessions.length === 0) {
      return;
    }

    setActiveSessionId(sessions[0].sessionId);
  }, [activeSessionId, initialActiveSessionId, sessions, setActiveSessionId]);

  function navigateToSession(sessionId: string | null) {
    if (sessionId) {
      router.push(`/agent/${encodeURIComponent(sessionId)}`);
      return;
    }

    router.push("/agent");
  }

  function selectSession(sessionId: string) {
    if (sessionId === activeSessionId) {
      return;
    }

    setActiveSessionId(sessionId);
    navigateToSession(sessionId);
  }

  function startRenaming(sessionId: string) {
    setRenamingSessionId(sessionId);
  }

  function cancelRenaming() {
    setRenamingSessionId(null);
  }

  async function createSession() {
    const nextSession = await createConversationMutation.mutateAsync({
      brand_id: DEFAULT_SESSION_BRAND_ID,
      store_id: DEFAULT_SESSION_STORE_ID,
      entry_mode: "manual",
      initial_question: "",
    });

    prependSession(nextSession);
    setActiveSessionId(nextSession.sessionId);
    setDeleteTargetSessionId(null);
    setRenamingSessionId(null);
    navigateToSession(nextSession.sessionId);

    return nextSession;
  }

  async function renameSession(sessionId: string, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setRenamingSessionId(null);
      return null;
    }

    const updatedSession = await renameConversationMutation.mutateAsync({
      sessionId,
      sessionTitle: trimmedTitle,
    });

    updateSession(sessionId, () => updatedSession);
    setRenamingSessionId(null);

    return updatedSession;
  }

  function requestDeleteSession(sessionId: string) {
    setDeleteTargetSessionId(sessionId);
  }

  function cancelDeleteSession() {
    setDeleteTargetSessionId(null);
  }

  async function deleteSession(sessionId: string): Promise<DeleteSessionResult> {
    await deleteConversationMutation.mutateAsync(sessionId);

    const remainingSessions = sessions.filter(
      (session) => session.sessionId !== sessionId,
    );
    const deletedCurrent = activeSessionId === sessionId;
    const nextSessionId = deletedCurrent
      ? (remainingSessions[0]?.sessionId ?? null)
      : activeSessionId;

    removeSession(sessionId);
    setDeleteTargetSessionId(null);
    setRenamingSessionId(null);
    setActiveSessionId(nextSessionId);

    if (deletedCurrent) {
      navigateToSession(nextSessionId);
    }

    return {
      deletedCurrent,
      nextSessionId,
    };
  }

  return {
    sessions,
    activeSessionId,
    deleteTargetSessionId,
    renamingSessionId,
    setActiveSessionId: selectSession,
    startRenaming,
    cancelRenaming,
    createSession,
    renameSession,
    requestDeleteSession,
    cancelDeleteSession,
    deleteSession,
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
  };
}
