"use client";

import { useEffect } from "react";

import { useBrandsStore } from "@/shared/store/brands-store";

export function TemplatesTab() {
  const templates = useBrandsStore((state) => state.templates);
  const selectedTemplateId = useBrandsStore((state) => state.selectedTemplateId);
  const selectTemplate = useBrandsStore((state) => state.selectTemplate);
  const updateTemplate = useBrandsStore((state) => state.updateTemplate);

  const selectedTemplate =
    selectedTemplateId === null
      ? null
      : templates.find((template) => template.id === selectedTemplateId) ?? null;

  useEffect(() => {
    if (templates.length === 0) {
      if (selectedTemplateId !== null) {
        selectTemplate(null);
      }

      return;
    }

    if (selectedTemplate === null) {
      selectTemplate(templates[0]?.id ?? null);
    }
  }, [selectTemplate, selectedTemplate, selectedTemplateId, templates]);

  if (!selectedTemplate) {
    return (
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <h2 className="text-xl font-semibold text-foreground">模板</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          添加一个品牌模板后，就可以开始配置可复用的诊断提示词。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="xl:w-72 xl:shrink-0">
          <h2 className="text-xl font-semibold text-foreground">模板</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            按不同场景沉淀可复用的诊断提示结构，无需离开品牌配置页。
          </p>
          <div className="mt-5 space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  template.id === selectedTemplate.id
                    ? "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-secondary))] text-foreground"
                    : "border-transparent bg-white text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em]">
                  {template.channel}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">模板名称</span>
            <input
              value={selectedTemplate.name}
              onChange={(event) =>
                updateTemplate(selectedTemplate.id, { name: event.target.value })
              }
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">使用场景</span>
            <input
              value={selectedTemplate.channel}
              onChange={(event) =>
                updateTemplate(selectedTemplate.id, {
                  channel: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">模板正文</span>
            <textarea
              value={selectedTemplate.body}
              onChange={(event) =>
                updateTemplate(selectedTemplate.id, { body: event.target.value })
              }
              rows={10}
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
