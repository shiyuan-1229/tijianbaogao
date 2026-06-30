"use client";

import { Clock3 } from "lucide-react";

import { mapKnowledgeSources } from "@/entities/knowledge/mappers";
import { useKnowledgeStore } from "@/shared/store/knowledge-store";

export function PendingPublishPanel() {
  const sources = useKnowledgeStore((state) => state.sources);
  const updateSource = useKnowledgeStore((state) => state.updateSource);
  const pendingSources = sources.filter(
    (source) =>
      source.status === "pending_publish" || source.status === "processing",
  );

  async function handlePublish(sourceId: string) {
    const response = await fetch(`/api/knowledge/sources/${sourceId}/publish`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const dto = await response.json();
    const [source] = mapKnowledgeSources([dto]);
    if (source) {
      updateSource(source);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[rgb(var(--surface-secondary))] p-2 text-[rgb(var(--accent))]">
          <Clock3 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">待发布</h2>
          <p className="text-sm text-muted-foreground">
            上传完成后先进入待发布队列，只有人工确认后才允许 Agent 检索使用。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {pendingSources.length > 0 ? (
          pendingSources.map((source) => (
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
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                  {source.status === "processing" ? "处理中" : "待发布"}
                </span>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handlePublish(source.id)}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface"
                >
                  发布到知识库
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] px-4 py-5 text-sm text-muted-foreground">
            当前没有待发布资料，新上传的知识会先进入这里等待人工发布。
          </div>
        )}
      </div>
    </section>
  );
}
