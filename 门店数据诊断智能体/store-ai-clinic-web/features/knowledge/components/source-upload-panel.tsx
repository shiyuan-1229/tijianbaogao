"use client";

import { useRef, useState } from "react";
import { FileUp, PlusCircle } from "lucide-react";

import { mapKnowledgeSources } from "@/entities/knowledge/mappers";
import {
  useKnowledgeStore,
  type KnowledgeSourceKind,
} from "@/shared/store/knowledge-store";

const sourceTypeOptions: Array<{
  value: KnowledgeSourceKind;
  label: string;
}> = [
  { value: "sop", label: "SOP 知识" },
  { value: "training", label: "培训资料" },
  { value: "inspection", label: "巡店记录" },
  { value: "diagnosis_case", label: "历史诊断案例" },
  { value: "brand_rule", label: "品牌运营规则" },
  { value: "hq_policy", label: "总部管理制度" },
  { value: "best_practice", label: "门店优秀案例" },
];

export function SourceUploadPanel() {
  const addSource = useKnowledgeStore((state) => state.addSource);
  const autoSync = useKnowledgeStore((state) => state.autoSync);
  const toggleAutoSync = useKnowledgeStore((state) => state.toggleAutoSync);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("六月动线操作手册");
  const [kind, setKind] = useState<KnowledgeSourceKind>("sop");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleAddSource() {
    const trimmedName = name.trim();
    if (!trimmedName || !selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append("source_title", trimmedName);
    formData.append("knowledge_type", kind);
    formData.append("version_label", "V1");
    formData.append("file", selectedFile);

    const response = await fetch("/api/knowledge/sources/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return;
    }

    const dto = await response.json();
    const [source] = mapKnowledgeSources([dto]);
    if (source) {
      addSource(source);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-foreground">上传新资料</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            把 SOP、业务规则和历史案例补进来，让 AI 在分析时更容易对齐你的经营口径。
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAutoSync}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white"
        >
          {autoSync ? "暂停自动同步" : "恢复自动同步"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">来源名称</span>
          <input
            aria-label="来源名称"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">来源类型</span>
          <select
            aria-label="来源类型"
            value={kind}
            onChange={(event) => setKind(event.target.value as KnowledgeSourceKind)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            {sourceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAddSource}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--accent))] px-4 py-3 text-sm font-medium text-[rgb(var(--accent-foreground))] shadow-[var(--shadow-soft)] transition hover:translate-y-[-1px]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>添加来源</span>
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-[rgb(var(--accent))] shadow-sm">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="w-full space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">上传通道</p>
              <p>
                当前支持 `.txt` 与 `.pdf` 文件上传，导入后会自动切分为可发布的知识片段。
              </p>
            </div>
            <label className="block space-y-2">
              <span className="font-medium text-foreground">知识文件</span>
              <input
                ref={fileInputRef}
                aria-label="知识文件"
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className="block w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground"
              />
            </label>
            {selectedFile ? (
              <p className="text-sm text-foreground">已选择：{selectedFile.name}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
