"use client";

import { Check, Download, FileArchive, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { QualityExportSummary } from "@/features/quality/components/quality-shell";
import {
  exportDeliverableGroups,
  exportDeliverablePreview,
  exportDeliverableSectionKeys,
  exportDeliverables,
  exportDescriptionFor,
  type ExportDeliverableTitle,
} from "@/features/quality/lib/quality-export-config";
import type { QualityExportTaskResponse } from "@/features/quality/lib/quality-export-types";

type ReportExportWorkspaceProps = {
  datasetPath: string;
  exportSummary: QualityExportSummary;
  disputedCount?: number;
  initialExportHistory?: QualityExportTaskResponse[];
};

function formatExportDate(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : value.slice(0, 10);
}

function exportStatusTone(status: QualityExportTaskResponse["status"]) {
  if (status === "done") return "success" as const;
  if (status === "running" || status === "queued") return "info" as const;
  if (status === "failed") return "danger" as const;
  return "draft" as const;
}

function ExportStatusChip({ status, tone }: { status: string; tone: "success" | "info" | "draft" | "danger" }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function ExportSnapshotMetric({ label, value, description, accent }: { label: string; value: string; description: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-3 py-3 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold leading-8 ${accent ?? "text-slate-900"}`}>{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

export function ReportExportWorkspace({
  datasetPath,
  exportSummary,
  disputedCount = 0,
  initialExportHistory = [],
}: ReportExportWorkspaceProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exportDeliverables.map((item) => [item, true])),
  );
  const [exportStatus, setExportStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<QualityExportTaskResponse[]>(initialExportHistory);

  useEffect(() => {
    setExportHistory(initialExportHistory);
  }, [initialExportHistory]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const response = await fetch("/api/quality/exports", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as QualityExportTaskResponse[];
        if (!cancelled && Array.isArray(data)) setExportHistory(data);
      } catch {
        // 静默回退
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCount = exportDeliverables.filter((item) => selectedItems[item]).length;
  const sectionByTitle = useMemo(
    () => new Map(exportSummary.sections.map((section) => [section.title, section])),
    [exportSummary.sections],
  );

  const previewRows = useMemo(() => {
    return exportDeliverables
      .filter((item) => selectedItems[item])
      .map((item) => {
        const live = sectionByTitle.get(item);
        const meta = exportDeliverablePreview[item];
        return {
          key: item,
          section: meta.chapter,
          content: meta.content,
          count: live ? `${live.itemCount} 项` : "—",
          format: meta.format,
        };
      });
  }, [sectionByTitle, selectedItems]);

  const datasetLabel = datasetPath.split(/[/\\]/).filter(Boolean).at(-1) ?? datasetPath;

  async function createExportPackage() {
    const selectedSections = Array.from(
      new Set(
        exportDeliverables
          .filter((item) => selectedItems[item])
          .flatMap((item) => exportDeliverableSectionKeys[item as ExportDeliverableTitle] ?? []),
      ),
    );
    setIsExporting(true);
    setDownloadUrl("");
    setExportStatus("正在生成交付包...");
    try {
      const response = await fetch("/api/quality/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          export_type: "报告交付包",
          dataset_path: exportSummary.datasetPath || datasetPath,
          selected_sections: selectedSections,
        }),
      });
      const data = (await response.json()) as Partial<QualityExportTaskResponse>;
      if (!response.ok || typeof data.message !== "string") throw new Error("export failed");
      setExportStatus(data.message);
      const nextUrl = typeof data.download_url === "string" ? data.download_url : "";
      setDownloadUrl(nextUrl);
      if (data.id) {
        const entry: QualityExportTaskResponse = {
          id: data.id,
          export_type: data.export_type ?? "报告交付包",
          dataset_path: exportSummary.datasetPath || datasetPath,
          status: data.status ?? "done",
          message: data.message,
          created_at: data.created_at ?? new Date().toISOString(),
          download_url: nextUrl || `/api/quality/exports/${data.id}/download`,
          artifact_count: data.artifact_count,
        };
        setExportHistory((current) => [entry, ...current]);
      }
    } catch {
      setExportStatus("生成交付包失败：请确认后端服务已启动，且数据集路径存在。");
      setDownloadUrl("");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-[#f5f7fb] to-slate-100 text-slate-900" aria-label="报告导出工作台">
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">交付中心</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">报告导出</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              把筛查结果、复核记录、结构化数据、合格 PDF 和问题分析整理成可交付 ZIP 包。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              已选 {selectedCount} / {exportDeliverables.length} 项
            </span>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              >
                <Download className="h-4 w-4" />
                下载最近交付包
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
              >
                <FileArchive className="h-4 w-4" />
                预览交付包
              </button>
            )}
          </div>
        </div>
        {exportStatus ? (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
              downloadUrl
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {exportStatus}
          </div>
        ) : null}
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-white px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">交付物选择</h2>
            <p className="mt-1 text-sm text-slate-500">勾选本次要打包的文件类型</p>
          </div>
          <div className="max-h-[720px] space-y-5 overflow-y-auto p-4">
            {exportDeliverableGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</h3>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const selected = Boolean(selectedItems[item]);
                    const liveSection = sectionByTitle.get(item);
                    return (
                      <label
                        key={item}
                        className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition ${
                          selected
                            ? "border-teal-200 bg-teal-50/40 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-teal-600"
                            checked={selected}
                            onChange={() => setSelectedItems((current) => ({ ...current, [item]: !current[item] }))}
                            aria-label={item}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800">{item}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {liveSection?.description ?? exportDescriptionFor(item)}
                            </span>
                          </span>
                        </span>
                        {selected ? (
                          <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            已选
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/60 to-white px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">导出预览</h2>
              <p className="mt-1 text-sm text-slate-500">面向交付的汇总，不再做分析操作</p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {datasetLabel}
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <ExportSnapshotMetric label="总问题" value={String(exportSummary.totalIssues)} description="进入导出范围" />
              <ExportSnapshotMetric
                label="已确认"
                value={String(exportSummary.confirmedIssues)}
                description="不合规清单"
                accent="text-rose-600"
              />
              <ExportSnapshotMetric
                label="待复核"
                value={String(exportSummary.pendingIssues)}
                description="单独列出"
                accent="text-amber-600"
              />
              <ExportSnapshotMetric
                label="争议"
                value={String(disputedCount)}
                description="附复核意见"
                accent="text-sky-600"
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">导出章节</th>
                    <th className="px-3 py-3">内容</th>
                    <th className="px-3 py-3">数量</th>
                    <th className="px-3 py-3">格式</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-800">{row.section}</td>
                      <td className="px-3 py-3 leading-5 text-slate-600">{row.content}</td>
                      <td className="px-3 py-3 text-slate-700">{row.count}</td>
                      <td className="px-3 py-3 text-slate-700">{row.format}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-3 text-xs leading-5 text-teal-800">
              导出后可在项目目录 <strong>质检交付/</strong> 下直接打开各子文件夹；浏览器下载的 ZIP 解压后结构相同。
            </p>
          </div>
        </section>

        <aside className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-white px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">导出记录</h2>
            <p className="mt-1 text-sm text-slate-500">保留每次交付版本</p>
          </div>
          <div className="flex max-h-[720px] flex-col p-4">
            <div className="min-h-0 flex-1 space-y-0 overflow-y-auto">
              {exportHistory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  暂无导出记录。生成第一个交付包后会显示在这里。
                </p>
              ) : (
                exportHistory.slice(0, 12).map((record) => {
                  const tone = exportStatusTone(record.status);
                  const statusLabel =
                    record.status === "done"
                      ? "完成"
                      : record.status === "running"
                        ? "生成中"
                        : record.status === "failed"
                          ? "失败"
                          : "排队中";
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">{formatExportDate(record.created_at)}</p>
                        <p className="truncate text-sm font-semibold text-slate-800">{record.export_type}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ExportStatusChip status={statusLabel} tone={tone} />
                        {record.status === "done" && record.download_url ? (
                          <a
                            href={record.download_url}
                            className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
                          >
                            下载
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">本次导出配置</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                包含 {selectedCount} 类交付物。ZIP 内附带 export-summary.json 元数据，便于追溯批次与规则命中。
              </p>
              <p className="mt-2 text-xs text-slate-500">
                存储目录见页面底部说明，或联系管理员查看 <code className="rounded bg-white px-1">data/quality/exports/</code>
              </p>
            </div>
            <button
              type="button"
              disabled={isExporting || selectedCount === 0}
              onClick={() => void createExportPackage()}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-sm font-semibold text-white shadow-md shadow-teal-600/20 hover:from-teal-700 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isExporting ? "生成中..." : "生成交付包"}
            </button>
            <Link href="/quality" className="mt-3 block text-center text-xs font-medium text-teal-700 hover:underline">
              返回批量检测继续筛查
            </Link>
          </div>
        </aside>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 px-6 py-4 text-xs leading-6 text-slate-600">
        <p className="font-semibold text-slate-800">导出文件存储位置（项目目录）</p>
        <p className="mt-1">
          每次导出会在项目下的 <code className="rounded bg-slate-100 px-1.5 py-0.5">质检交付/{"{数据集名}"}_{"{时间}"}_{"{任务ID}"}/</code>{" "}
          创建独立文件夹，并按类型分子目录：检测报告、批次总体情况表、结构化数据、合格PDF、问题详情分析等。
        </p>
        <p className="mt-1">
          同时会生成 <code className="rounded bg-slate-100 px-1.5 py-0.5">quality-export-{"{任务ID}"}.zip</code> 供浏览器下载；解压后与文件夹内容一致。
        </p>
      </footer>
    </div>
  );
}
