"use client";

import { Button } from "@/components/ui/button";

type ConversationEmptyStateProps = {
  onCreateConversation?: () => void;
};

const EMPTY_TITLE = "\u6b22\u8fce\u4f7f\u7528\u95e8\u5e97AI\u5206\u6790\u52a9\u624b";
const EMPTY_DESC =
  "\u4f60\u53ef\u4ee5\u4e0a\u4f20\u65e5\u62a5\u3001\u4e0a\u4f20\u5468\u62a5\u3001\u63d0\u51fa\u7ecf\u8425\u95ee\u9898\uff0c\u5e76\u83b7\u53d6\u53ef\u6267\u884c\u7684\u8bca\u65ad\u5efa\u8bae\u3002";
const FIRST_CTA = "\u521b\u5efa\u7b2c\u4e00\u4e2a\u8bca\u65ad\u4f1a\u8bdd";

export function ConversationEmptyState({
  onCreateConversation,
}: ConversationEmptyStateProps) {
  return (
    <section className="rounded-[2rem] border border-dashed border-border bg-white/82 p-8 text-center shadow-[var(--shadow-soft)]">
      <h2 className="text-2xl font-semibold text-foreground">{EMPTY_TITLE}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{EMPTY_DESC}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
        <span>{"\u4e0a\u4f20\u65e5\u62a5"}</span>
        <span>{"\u4e0a\u4f20\u5468\u62a5"}</span>
        <span>{"\u63d0\u51fa\u7ecf\u8425\u95ee\u9898"}</span>
        <span>{"\u83b7\u53d6\u8bca\u65ad\u5efa\u8bae"}</span>
      </div>
      <Button className="mt-6" onClick={onCreateConversation}>
        {FIRST_CTA}
      </Button>
    </section>
  );
}
