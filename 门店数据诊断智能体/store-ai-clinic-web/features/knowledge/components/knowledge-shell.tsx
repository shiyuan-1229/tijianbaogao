"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useEffect } from "react";

import { PendingPublishPanel } from "@/features/knowledge/components/pending-publish-panel";
import { PublishedSourcePanel } from "@/features/knowledge/components/published-source-panel";
import { RagStatusPanel } from "@/features/knowledge/components/rag-status-panel";
import { SourceList } from "@/features/knowledge/components/source-list";
import { SourceUploadPanel } from "@/features/knowledge/components/source-upload-panel";
import {
  useKnowledgeStore,
  type KnowledgeSource,
} from "@/shared/store/knowledge-store";
import { PageHeader } from "@/shared/ui/page-header";

type KnowledgeShellProps = {
  initialSources: KnowledgeSource[];
};

export function KnowledgeShell({ initialSources }: KnowledgeShellProps) {
  const sources = useKnowledgeStore((state) => state.sources);
  const replaceSources = useKnowledgeStore((state) => state.replaceSources);

  useEffect(() => {
    replaceSources(initialSources);
  }, [initialSources, replaceSources]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="知识库"
        title="让 AI 更懂你的门店知识"
        description="集中维护 SOP、业务规则和历史案例，让智能体在诊断时更贴近一线真实语境，减少泛化回答。"
        actions={
          <div className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-muted-foreground">
            已接入 {sources.length} 份知识资料
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SourceUploadPanel />
          <SourceList />
          <PendingPublishPanel />
          <PublishedSourcePanel />
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
            <h2 className="text-xl font-semibold text-foreground">
              这些知识会帮助 AI 在哪些场景更准确
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>当日营运指标异常时，优先用 SOP 和制度解释执行偏差。</li>
              <li>当用户继续追问整改动作时，优先引用已发布案例与规则。</li>
              <li>当规则冲突时，优先按最新发布版本给出建议和依据。</li>
            </ul>
          </section>

          <Collapsible.Root className="rounded-[2rem] border border-white/70 bg-white/82 shadow-[var(--shadow-soft)] backdrop-blur">
            <Collapsible.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left">
              <span className="text-sm font-medium text-foreground">
                查看知识准备情况
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Collapsible.Trigger>
            <Collapsible.Content className="border-t border-white/70 p-5">
              <RagStatusPanel />
            </Collapsible.Content>
          </Collapsible.Root>
        </div>
      </div>
    </div>
  );
}
