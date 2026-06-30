"use client";

import { BookCheck } from "lucide-react";

import { useKnowledgeStore } from "@/shared/store/knowledge-store";

export function PublishedSourcePanel() {
  const sources = useKnowledgeStore((state) => state.sources);
  const publishedSources = sources.filter(
    (source) => source.status === "published",
  );

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[rgb(var(--surface-secondary))] p-2 text-[rgb(var(--accent))]">
          <BookCheck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">已发布</h2>
          <p className="text-sm text-muted-foreground">
            这里的资料已经通过人工发布，可以作为 Agent 回答时的正式依据来源。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {publishedSources.length > 0 ? (
          publishedSources.map((source) => (
            <article
              key={source.id}
              className="rounded-[1.5rem] border border-border bg-white/90 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {source.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {source.versionLabel} 路 {source.updatedAt} 路 {source.chunkCount} 个分片
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  已发布
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] px-4 py-5 text-sm text-muted-foreground">
            当前还没有已发布资料，发布后的知识会出现在这里。
          </div>
        )}
      </div>
    </section>
  );
}
