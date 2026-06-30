"use client";

import { useSettingsStore } from "@/shared/store/settings-store";

export function ModelSettingsForm() {
  const model = useSettingsStore((state) => state.model);
  const updateModel = useSettingsStore((state) => state.updateModel);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-foreground">模型与 AI</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          定义默认模型配置与回复风格，让每次诊断都从一致的分析姿态出发。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">默认模型</span>
          <select
            value={model.defaultModel}
            onChange={(event) =>
              updateModel("defaultModel", event.target.value)
            }
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="o4-mini">o4-mini</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">升级策略</span>
          <select
            value={model.escalationPolicy}
            onChange={(event) =>
              updateModel("escalationPolicy", event.target.value)
            }
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            <option>严重异常自动升级</option>
            <option>仅建议升级</option>
            <option>不自动升级</option>
          </select>
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-foreground">回复风格</span>
          <textarea
            value={model.responseTone}
            onChange={(event) =>
              updateModel("responseTone", event.target.value)
            }
            rows={4}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
      </div>
    </section>
  );
}
