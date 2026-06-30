"use client";

import { useBrandsStore } from "@/shared/store/brands-store";

export function RulesTab() {
  const rules = useBrandsStore((state) => state.rules);
  const updateRule = useBrandsStore((state) => state.updateRule);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <h2 className="text-xl font-semibold text-foreground">诊断规则</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        定义阈值与叙述规则，让智能体知道何时应该把异常模式升级为明确诊断。
      </p>

      <div className="mt-6 space-y-4">
        {rules.map((rule) => (
          <article
            key={rule.id}
            className="rounded-[1.5rem] border border-border bg-white p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {rule.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {rule.description}
                </p>
              </div>
              <label className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) =>
                    updateRule(rule.id, { enabled: event.target.checked })
                  }
                />
                启用
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">阈值</span>
                <input
                  value={rule.threshold}
                  onChange={(event) =>
                    updateRule(rule.id, { threshold: event.target.value })
                  }
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">运营指引</span>
                <textarea
                  value={rule.guidance}
                  onChange={(event) =>
                    updateRule(rule.id, { guidance: event.target.value })
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
