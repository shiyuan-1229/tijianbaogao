"use client";

import {
  BookOpenText,
  CircleAlert,
  FileCheck2,
  LoaderCircle,
} from "lucide-react";

import {
  useKnowledgeStore,
  type KnowledgeSourceKind,
  type KnowledgeSourceStatus,
} from "@/shared/store/knowledge-store";

const statusConfig: Record<
  KnowledgeSourceStatus,
  {
    label: string;
    className: string;
    icon: typeof FileCheck2;
  }
> = {
  draft: {
    label: "草稿",
    className:
      "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    icon: CircleAlert,
  },
  processing: {
    label: "处理中",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    icon: LoaderCircle,
  },
  pending_publish: {
    label: "待发布",
    className:
      "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    icon: CircleAlert,
  },
  published: {
    label: "已发布",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    icon: FileCheck2,
  },
  archived: {
    label: "已归档",
    className:
      "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200",
    icon: CircleAlert,
  },
};

const sourceKindLabels: Record<KnowledgeSourceKind, string> = {
  sop: "SOP 知识",
  training: "培训资料",
  inspection: "巡店记录",
  diagnosis_case: "历史诊断案例",
  brand_rule: "品牌运营规则",
  hq_policy: "总部管理制度",
  best_practice: "门店优秀案例",
};

export function SourceList() {
  const sources = useKnowledgeStore((state) => state.sources);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">当前已接入内容</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            先看当前有哪些资料已经进入知识工作台，再决定下一步补哪一块经营上下文。
          </p>
        </div>
        <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          已跟踪 {sources.length} 项
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {sources.map((source) => {
          const { icon: StatusIcon, label, className } = statusConfig[source.status];

          return (
            <article
              key={source.id}
              className="rounded-[1.5rem] border border-border bg-white/90 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[rgb(var(--surface-secondary))] p-2 text-[rgb(var(--accent))]">
                      <BookOpenText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {source.name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {sourceKindLabels[source.kind]} · {source.versionLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    最近更新于 {source.updatedAt}，当前已整理 {source.chunkCount} 个可检索分片。
                  </p>
                </div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
