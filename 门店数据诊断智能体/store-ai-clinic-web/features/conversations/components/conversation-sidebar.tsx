"use client";

import type { ConversationSessionSummary } from "@/entities/conversations/types";

import { ConversationItem } from "@/features/conversations/components/conversation-item";
import { CreateConversationButton } from "@/features/conversations/components/create-conversation-button";

type ConversationSidebarProps = {
  activeSessionId: string | null;
  onCreateConversation?: () => void;
  onDeleteConversation?: (sessionId: string) => void;
  onRenameCancel?: () => void;
  onRenameCommit?: (sessionId: string, title: string) => void;
  onRenameConversation?: (sessionId: string) => void;
  onSelectSession?: (sessionId: string) => void;
  renamingSessionId?: string | null;
  sessions: ConversationSessionSummary[];
};

const SIDEBAR_TITLE = "\u4f1a\u8bdd\u5217\u8868";
const SIDEBAR_DESC =
  "\u56f4\u7ed5\u540c\u4e00\u95e8\u5e97\u95ee\u9898\u4fdd\u7559\u8fde\u7eed\u4e0a\u4e0b\u6587\uff0c\u65b9\u4fbf\u7ee7\u7eed\u8ffd\u95ee\u3001\u56de\u770b\u8bca\u65ad\u548c\u6574\u7406\u540e\u7eed\u52a8\u4f5c\u3002";
const EMPTY_HINT =
  "\u8fd8\u6ca1\u6709\u5386\u53f2\u4f1a\u8bdd\u3002\u4f60\u53ef\u4ee5\u5148\u521b\u5efa\u4e00\u4e2a\u8bca\u65ad\u4f1a\u8bdd\u5f00\u59cb\u5206\u6790\u3002";

export function ConversationSidebar({
  activeSessionId,
  onCreateConversation,
  onDeleteConversation,
  onRenameCancel,
  onRenameCommit,
  onRenameConversation,
  onSelectSession,
  renamingSessionId,
  sessions,
}: ConversationSidebarProps) {
  return (
    <aside className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{SIDEBAR_TITLE}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {SIDEBAR_DESC}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <CreateConversationButton onCreateConversation={onCreateConversation} />
      </div>

      <div className="mt-4 space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-4 py-5 text-sm leading-6 text-muted-foreground">
            {EMPTY_HINT}
          </div>
        ) : (
          sessions.map((session) => (
            <ConversationItem
              key={session.sessionId}
              session={session}
              active={session.sessionId === activeSessionId}
              isRenaming={renamingSessionId === session.sessionId}
              onSelect={onSelectSession}
              onRename={onRenameConversation}
              onRenameCancel={onRenameCancel}
              onRenameCommit={onRenameCommit}
              onDelete={onDeleteConversation}
            />
          ))
        )}
      </div>
    </aside>
  );
}
