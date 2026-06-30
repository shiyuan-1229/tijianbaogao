import type { ReactNode } from "react";

type MemoryReferencePanelProps = {
  children: ReactNode;
};

export function MemoryReferencePanel({
  children,
}: MemoryReferencePanelProps) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">历史引用</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          这里会汇总会话摘要、历史诊断和可复用的行动建议，帮助 AI 自动引用旧结论。
        </p>
      </div>

      <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4 text-sm leading-6 text-muted-foreground">
        已支持会话记忆、阶段摘要和诊断历史卡片，后续追问可以直接沿用这些上下文。
      </div>

      {children}
    </section>
  );
}
