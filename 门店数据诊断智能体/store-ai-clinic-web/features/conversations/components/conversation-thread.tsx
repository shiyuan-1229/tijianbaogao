import type {
  ConversationCitation,
  ConversationMessage,
} from "@/entities/conversations/types";
import { formatEvidenceMeta } from "@/entities/conversations/localization";
import { cn } from "@/shared/lib/cn";

type ConversationThreadProps = {
  messages: ConversationMessage[];
};

function formatCitationSource(citation: ConversationCitation) {
  return citation.pageNo !== null
    ? `《${citation.sourceTitle}》 第${citation.pageNo}页`
    : `《${citation.sourceTitle}》`;
}

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">对话进展</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          保留本轮分析、追问和行动建议，避免每次都从头解释背景。
        </p>
      </div>

      <div className="space-y-3">
        {messages.length > 0 ? (
          messages.map((message) => (
            <article
              key={message.messageId}
              className={cn(
                "rounded-[1.5rem] px-4 py-4 text-sm leading-6",
                message.role === "assistant"
                  ? "bg-[rgb(var(--surface-secondary))] text-foreground"
                  : "bg-[rgba(var(--accent),0.08)] text-foreground",
              )}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {message.role === "assistant" ? "AI 回复" : "用户追问"}
              </p>
              <p>{message.contentText}</p>

              {message.role === "assistant" && message.citations?.length ? (
                <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-white/75 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    依据来源
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-foreground">
                    {message.citations.map((citation) => (
                      <li
                        key={`${citation.sourceId}:${citation.pageNo ?? "na"}:${citation.quoteText}`}
                        className="rounded-[1rem] bg-white/80 px-3 py-3"
                      >
                        <p className="font-medium">
                          {formatCitationSource(citation)}
                        </p>
                        {citation.chapterTitle || citation.versionLabel ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[citation.chapterTitle, citation.versionLabel]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-6 text-foreground/90">
                          {citation.quoteText}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {message.role === "user" && message.evidenceFiles?.length ? (
                <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-white/70 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    本轮附带资料
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-foreground">
                    {message.evidenceFiles.map((file) => (
                      <li
                        key={`${file.name}:${file.size}:${file.type}`}
                        className="rounded-[1rem] bg-white/80 px-3 py-2"
                      >
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEvidenceMeta(file.type, file.size)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-4 py-6 text-sm leading-6 text-muted-foreground">
            还没有对话内容。输入一个门店问题，系统会从诊断结论开始，并支持继续追问。
          </div>
        )}
      </div>
    </section>
  );
}
