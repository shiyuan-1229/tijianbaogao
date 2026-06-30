"use client";

import { ShieldCheck, Sparkles, TimerReset } from "lucide-react";

import { useKnowledgeStore } from "@/shared/store/knowledge-store";

export function RagStatusPanel() {
  const readiness = useKnowledgeStore((state) => state.readiness);
  const sources = useKnowledgeStore((state) => state.sources);
  const publishedCount = sources.filter(
    (source) => source.status === "published",
  ).length;

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          检索质量
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          RAG 就绪度
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          用这块面板判断当前知识来源是否足够新鲜、完整，再决定是否扩大给更多运营同学使用。
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-[rgb(var(--accent))]" />
            <span>覆盖率</span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {readiness.coveragePercent}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sources.length} 个来源中有 {publishedCount} 个已经发布
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TimerReset className="h-4 w-4 text-[rgb(var(--accent))]" />
            <span>新鲜度</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-foreground">
            {readiness.freshnessWindow}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            同步目标：{readiness.syncCadence}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-[rgb(var(--accent))]" />
            <span>当前重点</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-foreground">
            {readiness.priorityTopic}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">建议下一轮优先索引</p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-border bg-white/90 p-5">
        <h3 className="text-sm font-semibold text-foreground">当前阻塞</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {readiness.blockers.map((blocker) => (
            <li
              key={blocker}
              className="rounded-2xl bg-[rgb(var(--surface-secondary))] px-4 py-3"
            >
              {blocker}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
