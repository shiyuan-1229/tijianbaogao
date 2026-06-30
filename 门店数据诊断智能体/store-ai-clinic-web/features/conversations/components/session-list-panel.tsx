import type { ConversationSessionSummary } from "@/entities/conversations/types";
import { cn } from "@/shared/lib/cn";

type SessionListPanelProps = {
  sessions: ConversationSessionSummary[];
  activeSessionId: string | null;
  onSelectSession?: (sessionId: string) => void;
};

export function SessionListPanel({
  sessions,
  activeSessionId,
  onSelectSession,
}: SessionListPanelProps) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">会话列表</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          围绕同一门店问题保留连续上下文，方便继续追问和回看诊断。
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const active = session.sessionId === activeSessionId;

            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onSelectSession?.(session.sessionId)}
                className={cn(
                  "w-full rounded-[1.25rem] border px-4 py-3 text-left transition",
                  active
                    ? "border-[rgb(var(--accent))]/25 bg-[rgba(var(--accent),0.08)]"
                    : "border-border bg-[rgb(var(--surface-secondary))] hover:border-[rgb(var(--border-strong))]",
                )}
              >
                <p className="text-sm font-medium text-foreground">
                  {session.sessionTitle}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {session.storeId}
                </p>
              </button>
            );
          })
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-4 py-5 text-sm leading-6 text-muted-foreground">
            还没有历史会话。你可以先发起一个门店问题，再持续围绕它深入分析。
          </div>
        )}
      </div>
    </section>
  );
}
