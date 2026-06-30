"use client";

import { useMemo } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  ConversationFollowupSuggestion,
  ConversationMessage,
  ConversationSessionSummary,
} from "@/entities/conversations/types";
import { ChatComposer } from "@/features/conversations/components/chat-composer";
import { ConversationEmptyState } from "@/features/conversations/components/conversation-empty-state";
import { ConversationSidebar } from "@/features/conversations/components/conversation-sidebar";
import { ConversationThread } from "@/features/conversations/components/conversation-thread";
import { DeleteConversationDialog } from "@/features/conversations/components/delete-conversation-dialog";
import { FollowupSuggestionChips } from "@/features/conversations/components/followup-suggestion-chips";
import { MemoryReferencePanel } from "@/features/conversations/components/memory-reference-panel";
import { useConversationThread } from "@/features/conversations/hooks/use-conversation-thread";
import { useSessionList } from "@/features/conversations/hooks/use-session-list";
import { useConversationRuntimeStore } from "@/shared/store/conversation-runtime-store";
import { PageHeader } from "@/shared/ui/page-header";

type ConversationShellProps = {
  initialActiveSessionId?: string | null;
  messages: ConversationMessage[];
  sessions: ConversationSessionSummary[];
  suggestions: ConversationFollowupSuggestion[];
};

const HEADER_EYEBROW = "\u5bf9\u8bdd\u667a\u80fd\u4f53";
const HEADER_TITLE = "\u6301\u7eed\u5bf9\u8bdd\u8bca\u65ad\u5de5\u4f5c\u533a";
const HEADER_DESC =
  "\u56f4\u7ed5\u540c\u4e00\u95e8\u5e97\u95ee\u9898\u6301\u7eed\u8ffd\u95ee\u3001\u6bd4\u8f83\u548c\u6c89\u6dc0\u6574\u6539\u65b9\u6848\uff0c\u8ba9\u8bca\u65ad\u4ece\u4e00\u6b21\u6027\u8f93\u51fa\u5347\u7ea7\u4e3a\u8fde\u7eed\u7ecf\u8425\u5bf9\u8bdd\u3002";
const CREATE_CONFIRM_TITLE = "\u662f\u5426\u521b\u5efa\u65b0\u4f1a\u8bdd\uff1f";
const CREATE_CONFIRM_DESC = "\u5f53\u524d\u4f1a\u8bdd\u5185\u5bb9\u5c06\u4fdd\u7559\u3002";
const CANCEL_LABEL = "\u53d6\u6d88";
const CREATE_LABEL = "\u521b\u5efa";

export function ConversationShell({
  initialActiveSessionId = null,
  sessions: initialSessions,
  messages: initialMessages,
  suggestions: initialSuggestions,
}: ConversationShellProps) {
  const {
    sessions,
    activeSessionId,
    renamingSessionId,
    deleteTargetSessionId,
    setActiveSessionId,
    startRenaming,
    cancelRenaming,
    createSession,
    renameSession,
    requestDeleteSession,
    cancelDeleteSession,
    deleteSession,
  } = useSessionList({
    initialActiveSessionId,
    initialSessions,
  });
  const pendingCreateConfirm = useConversationRuntimeStore(
    (state) => state.pendingCreateConfirm,
  );
  const setPendingCreateConfirm = useConversationRuntimeStore(
    (state) => state.setPendingCreateConfirm,
  );

  const fallbackSessionId = useMemo(() => {
    if (activeSessionId) {
      return activeSessionId;
    }

    if (initialActiveSessionId) {
      return initialActiveSessionId;
    }

    return sessions[0]?.sessionId ?? null;
  }, [activeSessionId, initialActiveSessionId, sessions]);

  const {
    messages,
    suggestions,
    composerDraft,
    setComposerDraft,
    selectedFiles,
    uploadError,
    setSelectedFiles,
    removeSelectedFile,
    setUploadError,
    sendMessage,
    isSubmitting,
    clearDraftArtifacts,
  } = useConversationThread({
    sessionId: fallbackSessionId,
    initialMessages,
    initialSuggestions,
  });

  const hasUnsavedContent =
    composerDraft.trim().length > 0 || selectedFiles.length > 0;
  const hasNoSessions = sessions.length === 0 && !fallbackSessionId;
  const deleteTargetConversation = deleteTargetSessionId
    ? sessions.find((session) => session.sessionId === deleteTargetSessionId) ?? null
    : null;

  async function createBlankConversation() {
    clearDraftArtifacts();
    await createSession();
  }

  function handleCreateConversation() {
    if (hasUnsavedContent) {
      setPendingCreateConfirm(true);
      return;
    }

    void createBlankConversation();
  }

  function confirmCreateConversation() {
    setPendingCreateConfirm(false);
    void createBlankConversation();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={HEADER_EYEBROW}
        title={HEADER_TITLE}
        description={HEADER_DESC}
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <ConversationSidebar
          sessions={sessions}
          activeSessionId={fallbackSessionId}
          renamingSessionId={renamingSessionId}
          onCreateConversation={handleCreateConversation}
          onSelectSession={setActiveSessionId}
          onRenameConversation={startRenaming}
          onRenameCancel={cancelRenaming}
          onRenameCommit={(sessionId, title) => void renameSession(sessionId, title)}
          onDeleteConversation={requestDeleteSession}
        />

        {hasNoSessions ? (
          <ConversationEmptyState onCreateConversation={handleCreateConversation} />
        ) : (
          <div className="space-y-4 rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
            <ConversationThread messages={messages} />
            <ChatComposer
              value={composerDraft}
              isSubmitting={isSubmitting}
              files={selectedFiles}
              uploadError={uploadError}
              onFilesSelected={setSelectedFiles}
              onFileRemove={removeSelectedFile}
              onClearUploadError={() => setUploadError(null)}
              onChange={setComposerDraft}
              onSubmit={() => void sendMessage(composerDraft)}
            />
          </div>
        )}

        <MemoryReferencePanel>
          <FollowupSuggestionChips suggestions={suggestions} />
        </MemoryReferencePanel>
      </div>

      <AlertDialog
        open={pendingCreateConfirm}
        onOpenChange={setPendingCreateConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CREATE_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>{CREATE_CONFIRM_DESC}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{CANCEL_LABEL}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateConversation}>
              {CREATE_LABEL}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConversationDialog
        conversationTitle={deleteTargetConversation?.sessionTitle}
        open={Boolean(deleteTargetSessionId)}
        onOpenChange={(open) => {
          if (!open) {
            cancelDeleteSession();
          }
        }}
        onConfirm={() => {
          if (!deleteTargetSessionId) {
            return;
          }

          void deleteSession(deleteTargetSessionId);
        }}
      />
    </div>
  );
}
