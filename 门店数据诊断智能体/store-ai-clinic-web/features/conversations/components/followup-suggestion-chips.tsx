import type { ConversationFollowupSuggestion } from "@/entities/conversations/types";

type FollowupSuggestionChipsProps = {
  suggestions: ConversationFollowupSuggestion[];
};

export function FollowupSuggestionChips({
  suggestions,
}: FollowupSuggestionChipsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">建议追问</h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <button
              key={`${suggestion.intent}:${suggestion.text}`}
              type="button"
              className="rounded-full border border-border bg-white px-3 py-2 text-left text-sm leading-5 text-foreground transition hover:border-[rgb(var(--accent))]"
            >
              {suggestion.text}
            </button>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            当前还没有自动追问建议，发起诊断后会根据结论推荐下一步问题。
          </p>
        )}
      </div>
    </div>
  );
}
