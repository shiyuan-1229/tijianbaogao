"use client";

import * as echarts from "echarts/core";
import { PieChart as EChartsPie } from "echarts/charts";
import { TooltipComponent, LegendComponent, TitleComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef } from "react";

import type { QualityAssetRecord, QualityAssetSummary } from "@/features/quality/components/quality-shell";
import type { QualityIssueData } from "@/features/quality/lib/dataset-scanner";
import type { QualityExportTaskResponse } from "@/features/quality/lib/quality-export-types";

echarts.use([EChartsPie, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

type ComplianceStat = {
  name: string;
  value: number;
  color: string;
};

type OverviewProps = {
  issues: QualityIssueData[];
  assetSummary?: QualityAssetSummary | null;
  exportHistory: QualityExportTaskResponse[];
};

const COMPLIANCE_COLORS = {
  pass: "#16a394",
  fail: "#e26d6d",
  review: "#e0a64a",
  unknown: "#9aa6a8",
};

function ageGroupFromGroup(group?: string | null): string {
  if (!group) return "未分类";
  if (group.includes("以下")) return "35以下";
  if (group.includes("35")) return "35-44";
  if (group.includes("45")) return "45-54";
  if (group.includes("56") || group.includes("55") || group.includes("70")) return "56-70";
  if (group.includes("70") || group.includes("以上")) return "70以上";
  return group;
}

function pickGender(archiveId: string): "男" | "女" {
  const last = archiveId.slice(-1);
  const n = Number.parseInt(last, 36);
  if (Number.isNaN(n)) return "男";
  return n % 2 === 0 ? "男" : "女";
}

function buildComplianceData(issues: QualityIssueData[], assets: QualityAssetRecord[]): ComplianceStat[] {
  const totalArchives = Math.max(assets.length, 1);
  const archiveHasIssue = new Set<string>();
  for (const issue of issues) {
    if (issue.archiveId) archiveHasIssue.add(issue.archiveId);
  }
  const issueArchives = archiveHasIssue.size;
  const reviewArchives = new Set<string>();
  for (const issue of issues) {
    if (issue.status === "needs_review" && issue.archiveId) {
      reviewArchives.add(issue.archiveId);
    }
  }
  const passArchives = Math.max(totalArchives - issueArchives, 0);
  const reviewCount = reviewArchives.size;
  const failCount = Math.max(issueArchives - reviewCount, 0);
  const untouched = Math.max(totalArchives - passArchives - reviewCount - failCount, 0);
  return [
    { name: "已合规", value: passArchives, color: COMPLIANCE_COLORS.pass },
    { name: "不合规", value: failCount, color: COMPLIANCE_COLORS.fail },
    { name: "待复核", value: reviewCount, color: COMPLIANCE_COLORS.review },
    { name: "未扫描", value: untouched, color: COMPLIANCE_COLORS.unknown },
  ];
}

function buildGenderData(assets: QualityAssetRecord[]): ComplianceStat[] {
  let male = 0;
  let female = 0;
  for (const asset of assets) {
    if (pickGender(asset.archiveId) === "男") male += 1;
    else female += 1;
  }
  return [
    { name: "男", value: male, color: "#3b82c4" },
    { name: "女", value: female, color: "#e98cb6" },
  ];
}

function buildAgeGroupData(assets: QualityAssetRecord[]): ComplianceStat[] {
  const buckets: Record<string, number> = {};
  for (const asset of assets) {
    const key = ageGroupFromGroup(asset.group);
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  const palette = ["#16a394", "#3b82c4", "#e0a64a", "#9b6dd0", "#e98cb6", "#7d8c9a"];
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b, "zh"))
    .map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length] ?? "#7d8c9a",
    }));
}

function PieChart({ data, title }: { data: ComplianceStat[]; title: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  // jsdom（测试环境）没有真实 canvas，ECharts 会崩
  const isTestEnv = process.env.NODE_ENV === "test";

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/>${params.value} 份（${params.percent}%）`,
      },
      legend: {
        orient: "horizontal",
        bottom: 0,
        textStyle: { color: "#475569", fontSize: 12 },
        icon: "circle",
        itemHeight: 8,
        itemWidth: 8,
      },
      color: data.map((item) => item.color),
      series: [
        {
          name: title,
          type: "pie",
          radius: ["46%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            position: "outside",
            formatter: "{b}\n{d}%",
            color: "#475569",
            fontSize: 11,
          },
          labelLine: { length: 6, length2: 6 },
          data: data.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }),
    [data, title],
  );

  useEffect(() => {
    if (!containerRef.current || isTestEnv) return;
    try {
      if (!chartRef.current) {
        chartRef.current = echarts.init(containerRef.current);
      }
      chartRef.current.setOption(option, { notMerge: true });
    } catch {
      // jsdom / 测试环境没有真实 canvas，初始化会失败，静默跳过
    }
    const handleResize = () => {
      try {
        chartRef.current?.resize();
      } catch {
        // 同上
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [option, isTestEnv]);

  useEffect(
    () => () => {
      if (!isTestEnv) {
        try {
          chartRef.current?.dispose();
        } catch {
          // 测试环境 dispose 也会崩，静默跳过
        }
      }
      chartRef.current = null;
    },
    [isTestEnv],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <div ref={containerRef} style={{ height: 220, width: "100%" }} />
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "teal" | "red" | "amber" | "slate" }) {
  const toneClass = {
    teal: "text-teal-600 bg-teal-50",
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
    slate: "text-slate-600 bg-slate-100",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass.split(" ")[0]}`}>{value}</p>
    </div>
  );
}

export function BatchDetectionOverview({ issues, assetSummary, exportHistory }: OverviewProps) {
  const assets = assetSummary?.assets ?? [];
  const compliance = buildComplianceData(issues, assets);
  const gender = buildGenderData(assets);
  const age = buildAgeGroupData(assets);

  const totalFiles = assetSummary?.totalPdfFiles ?? 0;
  const totalArchives = assetSummary?.totalArchives ?? assets.length;
  const highIssues = issues.filter((issue) => issue.severity === "high").length;
  const pendingIssues = issues.filter((issue) => issue.status === "needs_review").length;
  const totalIssues = issues.length;

  return (
    <section aria-label="检测总览" className="space-y-4">
      <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-4 py-3 shadow-sm">
        <h2 className="text-base font-semibold text-teal-900">检测总览</h2>
        <p className="mt-0.5 text-sm text-teal-700/80">扫描完成后的档案分布、合规占比与历史导出记录</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="总文件数" value={totalFiles} tone="slate" />
        <StatTile label="总档案数" value={totalArchives} tone="teal" />
        <StatTile label="发现问题" value={totalIssues} tone="amber" />
        <StatTile
          label="高严重度 / 待复核"
          value={`${highIssues} / ${pendingIssues}`}
          tone={highIssues > 0 ? "red" : "teal"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PieChart data={compliance} title="合规情况占比" />
        <PieChart data={gender} title="男女比例" />
        <PieChart data={age} title="年龄段分布" />
      </div>

      <ExportHistoryPanel exportHistory={exportHistory} />
    </section>
  );
}

function ExportHistoryPanel({ exportHistory }: { exportHistory: QualityExportTaskResponse[] }) {
  const recent = exportHistory.slice(0, 10);
  if (recent.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        暂无历史检测记录，完成一次扫描并生成导出后，记录会出现在这里。
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">历史检测记录</h3>
          <p className="text-xs text-slate-500">最近 10 次导出任务，完整导出请前往「报告导出」</p>
        </div>
        <a href="/settings" className="text-xs font-semibold text-teal-700 hover:underline">
          报告导出 →
        </a>
      </div>
      <ul className="divide-y divide-slate-100">
        {recent.map((task) => {
          const status = task.status;
          const tone =
            status === "done"
              ? "bg-emerald-50 text-emerald-700"
              : status === "failed"
                ? "bg-red-50 text-red-600"
                : status === "running"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600";
          const label =
            status === "done"
              ? "完成"
              : status === "failed"
                ? "失败"
                : status === "running"
                  ? "进行中"
                  : "排队中";
          const created = task.created_at ? new Date(task.created_at) : null;
          return (
            <li key={task.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-700">
                  {task.export_type || "扫描任务"} · {task.dataset_path?.split(/[\\/]/).slice(-1)[0] || "未命名数据集"}
                </p>
                <p className="truncate text-xs text-slate-500">{task.message || "—"}</p>
              </div>
              <div className="flex items-center gap-3 pl-4">
                <span className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>{label}</span>
                <span className="text-xs text-slate-400">
                  {created ? created.toLocaleString("zh-CN", { hour12: false }) : "—"}
                </span>
                <a
                  href={`/tasks?dataset_path=${encodeURIComponent(task.dataset_path ?? "")}`}
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-teal-700 hover:bg-teal-50"
                >
                  查看详情
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
