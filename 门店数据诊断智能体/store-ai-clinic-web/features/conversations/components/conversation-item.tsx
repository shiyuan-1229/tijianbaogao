"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { localizeStoreName } from "@/entities/conversations/localization";
import type { ConversationSessionSummary } from "@/entities/conversations/types";
import { cn } from "@/shared/lib/cn";

import { ConversationMenu } from "@/features/conversations/components/conversation-menu";

type ConversationItemProps = {
  session: ConversationSessionSummary;
  active?: boolean;
  isRenaming?: boolean;
  onDelete?: (sessionId: string) => void;
  onRename?: (sessionId: string) => void;
  onRenameCancel?: () => void;
  onRenameCommit?: (sessionId: string, sessionTitle: string) => void;
  onSelect?: (sessionId: string) => void;
};

const RENAME_INPUT_LABEL = "\u91cd\u547d\u540d\u4f1a\u8bdd";

export function ConversationItem({
  session,
  active = false,
  isRenaming = false,
  onDelete,
  onRename,
  onRenameCancel,
  onRenameCommit,
  onSelect,
}: ConversationItemProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isRenaming]);

  function resetRenameInput() {
    if (inputRef.current) {
      inputRef.current.value = session.sessionTitle;
    }
  }

  function commitRename() {
    const nextTitle = inputRef.current?.value.trim() ?? session.sessionTitle;

    if (!nextTitle || nextTitle === session.sessionTitle) {
      resetRenameInput();
      onRenameCancel?.();
      return;
    }

    onRenameCommit?.(session.sessionId, nextTitle);
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-[1.25rem] border px-3 py-3 transition",
        active
          ? "border-[rgb(var(--accent))]/25 bg-[rgba(var(--accent),0.08)]"
          : "border-border bg-[rgb(var(--surface-secondary))] hover:border-[rgb(var(--border-strong))]",
      )}
    >
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <Input
            key={`${session.sessionId}-${session.sessionTitle}`}
            ref={inputRef}
            defaultValue={session.sessionTitle}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitRename();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                resetRenameInput();
                onRenameCancel?.();
              }
            }}
            aria-label={RENAME_INPUT_LABEL}
            className="h-9"
          />
        ) : (
          <button
            type="button"
            className="w-full min-w-0 text-left"
            onClick={() => onSelect?.(session.sessionId)}
            aria-current={active ? "true" : undefined}
          >
            <p className="truncate text-sm font-medium text-foreground">
              {session.sessionTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeStoreName(session.storeId)}
            </p>
          </button>
        )}
      </div>
      <ConversationMenu
        onRename={onRename ? () => onRename(session.sessionId) : undefined}
        onDelete={onDelete ? () => onDelete(session.sessionId) : undefined}
      />
    </div>
  );
}
