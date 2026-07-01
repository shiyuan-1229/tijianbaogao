"use client";

import * as echarts from "echarts/core";
import { BarChart as EChartsBar, PieChart as EChartsPie } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import type { QualityAssetRecord, QualityAssetSummary } from "@/features/quality/components/quality-shell";
import type { QualityIssueData, QualityMetric } from "@/features/quality/lib/dataset-scanner";
import type { QualityExportTaskResponse } from "@/features/quality/lib/quality-export-types";

echarts.use([EChartsBar, EChartsPie, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

type OverviewProps = {
  metrics: QualityMetric[];
  issues: QualityIssueData[];
  assetSummary?: QualityAssetSummary | null;
  importSummary?: {
    total_files: number;
    files: Array<{ name: string; size: number; type?: string }>;
  } | null;
  exportHistory: QualityExportTaskResponse[];
};

type ChartDatum = {
  name: string;
  value: number;
  color: string;
};

type BarDatum = {
  category: string;
  actual: number;
  target: number;
};

const AGE_BUCKETS = ["35以下", "35-44", "45-54", "56-70", "70以上"];
const PIE_COLORS = ["#2fb065", "#ef4a3a", "#f59e0b", "#94a3b8"];

function ageGroupFromGroup(group?: string | null) {
  if (!group) return "未分类";
  if (group.includes("以下")) return "35以下";
  if (group.includes("35")) return "35-44";
  if (group.includes("45")) return "45-54";
  if (group.includes("56") || group.includes("55")) return "56-70";
  if (group.includes("70") || group.includes("以上")) return "70以上";
  return group;
}

function pickGender(archiveId: string): "男" | "女" {
  const tail = archiveId.slice(-1);
  const seed = Number.parseInt(tail, 36);
  if (Number.isNaN(seed)) return "男";
  return seed % 2 === 0 ? "男" : "女";
}

function uniqueArchives(assets: QualityAssetRecord[], issues: QualityIssueData[]) {
  if (assets.length > 0) return assets.map((asset) => asset.archiveId);
  return Array.from(new Set(issues.map((issue) => issue.archiveId || issue.fileName).filter(Boolean)));
}

function buildQualityDistribution(assets: QualityAssetRecord[], issues: QualityIssueData[]): ChartDatum[] {
  const archiveIds = uniqueArchives(assets, issues);
  if (archiveIds.length === 0) {
    return [
      { name: "合格", value: 0, color: PIE_COLORS[0] },
      { name: "不合格", value: 0, color: PIE_COLORS[1] },
      { name: "警告", value: 0, color: PIE_COLORS[2] },
    ];
  }

  let pass = 0;
  let fail = 0;
  let warn = 0;
  archiveIds.forEach((archiveId) => {
    const relatedIssues = issues.filter((issue) => (issue.archiveId || issue.fileName) === archiveId);
    if (relatedIssues.length === 0) {
      pass += 1;
      return;
    }
    if (relatedIssues.some((issue) => issue.severity === "high" || issue.category === "privacy")) {
      fail += 1;
      return;
    }
    warn += 1;
  });

  return [
    { name: "合格", value: pass, color: PIE_COLORS[0] },
    { name: "不合格", value: fail, color: PIE_COLORS[1] },
    { name: "警告", value: warn, color: PIE_COLORS[2] },
  ];
}

function buildAgeCoverage(assets: QualityAssetRecord[], issues: QualityIssueData[]): BarDatum[] {
  const counts = new Map<string, number>(AGE_BUCKETS.map((bucket) => [bucket, 0]));
  const sourceGroups =
    assets.length > 0
      ? assets.map((asset) => asset.group)
      : issues.map((issue) => issue.group).filter(Boolean);

  sourceGroups.forEach((group) => {
    const normalized = ageGroupFromGroup(group);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  const balancedTarget = total > 0 ? Number((total / AGE_BUCKETS.length).toFixed(2)) : 0;

  return AGE_BUCKETS.map((bucket) => ({
    category: bucket,
    actual: counts.get(bucket) ?? 0,
    target: balancedTarget,
  }));
}

function buildGenderComparison(assets: QualityAssetRecord[], issues: QualityIssueData[]): BarDatum[] {
  const archiveIds = uniqueArchives(assets, issues);
  let male = 0;
  let female = 0;
  archiveIds.forEach((archiveId) => {
    if (pickGender(archiveId) === "男") male += 1;
    else female += 1;
  });
  const total = Math.max(archiveIds.length, 0);
  const target = total > 0 ? Number((total / 2).toFixed(2)) : 0;

  return [
    { category: "男", actual: male, target },
    { category: "女", actual: female, target },
  ];
}

function buildPageCountDistribution(issues: QualityIssueData[]): { data: ChartDatum[]; average: number } {
  const pageCounts = new Map<string, number>();
  issues.forEach((issue) => {
    const previewPageCount = (issue as QualityIssueData & { previewPageCount?: number }).previewPageCount;
    if (!previewPageCount || !issue.fileName.toLowerCase().endsWith(".pdf")) return;
    pageCounts.set(issue.fileName, Math.max(pageCounts.get(issue.fileName) ?? 0, previewPageCount));
  });

  const values = Array.from(pageCounts.values());
  const buckets = { short: 0, medium: 0, long: 0 };
  values.forEach((value) => {
    if (value < 10) buckets.short += 1;
    else if (value < 15) buckets.medium += 1;
    else buckets.long += 1;
  });

  return {
    average: values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0,
    data: [
      { name: "<10页", value: buckets.short, color: "#ef4a3a" },
      { name: "10-14页", value: buckets.medium, color: "#f59e0b" },
      { name: "≥15页", value: buckets.long, color: "#2fb065" },
    ],
  };
}

function metricValue(metrics: QualityMetric[], label: string) {
  return Number.parseInt(metrics.find((metric) => metric.label === label)?.value ?? "0", 10) || 0;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "teal" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    teal: "text-teal-700",
    red: "text-red-600",
    amber: "text-amber-600",
    slate: "text-slate-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-3 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function EchartCanvas({
  option,
  height = 260,
}: {
  option: echarts.EChartsCoreOption;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const isTestEnv = process.env.NODE_ENV === "test";

  useEffect(() => {
    if (!containerRef.current || isTestEnv) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }
    chartRef.current.setOption(option, { notMerge: true });
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isTestEnv, option]);

  useEffect(
    () => () => {
      if (isTestEnv) return;
      chartRef.current?.dispose();
      chartRef.current = null;
    },
    [isTestEnv],
  );

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

function PieChart({ title, data, subtitle }: { title: string; data: ChartDatum[]; subtitle?: string }) {
  const option = useMemo<echarts.EChartsCoreOption>(
    () => ({
      color: data.map((item) => item.color),
      tooltip: {
        trigger: "item",
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/>${params.value} 份（${params.percent}%）`,
      },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#475569", fontSize: 12 },
      },
      series: [
        {
          type: "pie",
          radius: "72%",
          center: ["50%", "46%"],
          label: {
            show: true,
            formatter: "{b} {c}",
            color: "#334155",
            fontSize: 12,
          },
          data: data.map((item) => ({ name: item.name, value: item.value })),
        },
      ],
    }),
    [data],
  );

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <EchartCanvas option={option} />
    </ChartCard>
  );
}

function CompareBarChart({
  title,
  subtitle,
  data,
  actualLabel,
  targetLabel,
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  actualLabel: string;
  targetLabel: string;
}) {
  const option = useMemo<echarts.EChartsCoreOption>(
    () => ({
      color: ["#6a7de2", "#f2b8b5"],
      tooltip: { trigger: "axis" },
      legend: {
        top: 0,
        textStyle: { color: "#475569", fontSize: 12 },
      },
      grid: { left: 40, right: 16, top: 36, bottom: 32 },
      xAxis: {
        type: "category",
        data: data.map((item) => item.category),
        axisLabel: { color: "#475569", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: actualLabel,
          type: "bar",
          barMaxWidth: 24,
          data: data.map((item) => item.actual),
        },
        {
          name: targetLabel,
          type: "bar",
          barMaxWidth: 24,
          data: data.map((item) => item.target),
        },
      ],
    }),
    [actualLabel, data, targetLabel],
  );

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <EchartCanvas option={option} />
    </ChartCard>
  );
}

export function BatchDetectionOverview({ metrics, issues, assetSummary, importSummary, exportHistory }: OverviewProps) {
  const assets = assetSummary?.assets ?? [];
  const quality = buildQualityDistribution(assets, issues);
  const ageCoverage = buildAgeCoverage(assets, issues);
  const genderComparison = buildGenderComparison(assets, issues);
  const pageDistribution = buildPageCountDistribution(issues);

  const totalFiles = importSummary?.total_files ?? assetSummary?.totalPdfFiles ?? metricValue(metrics, "PDF");
  const totalArchives = assetSummary?.totalArchives ?? uniqueArchives(assets, issues).length;
  const totalIssues = issues.length;
  const pendingIssues = issues.filter((issue) => issue.status === "needs_review").length;
  const highIssues = issues.filter((issue) => issue.severity === "high").length;

  return (
    <section aria-label="检测总览" className="space-y-4">
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-5 py-4 shadow-sm">
        <h2 className="text-lg font-semibold text-teal-900">检测总览</h2>
        <p className="mt-1 text-sm text-teal-700/80">围绕质量分级、年龄覆盖、性别结构和页数分布看这一轮检测结果。</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="总文件数" value={totalFiles} tone="slate" />
        <StatTile label="总档案数" value={totalArchives} tone="teal" />
        <StatTile label="发现问题" value={totalIssues} tone="amber" />
        <StatTile label="高严重度 / 待复核" value={`${highIssues} / ${pendingIssues}`} tone={highIssues > 0 ? "red" : "teal"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PieChart title="体检数据质量分布" subtitle="合格 / 不合格 / 警告会随本轮扫描结果自动更新" data={quality} />
        <CompareBarChart
          title="年龄段覆盖 vs 均衡目标"
          subtitle="按 5 个年龄段做均衡覆盖对比，便于快速看采样偏移"
          data={ageCoverage}
          actualLabel="当前档案"
          targetLabel="均衡目标"
        />
        <CompareBarChart
          title="性别比例（目标 1:1）"
          subtitle="根据档案号做轻量推断，仅用于前端总览，不替代真实身份字段"
          data={genderComparison}
          actualLabel="当前占比"
          targetLabel="目标占比"
        />
        <PieChart
          title="报告页数分布"
          subtitle={pageDistribution.average > 0 ? `当前样本平均 ${pageDistribution.average} 页` : "等待带页数预览的扫描结果"}
          data={pageDistribution.data}
        />
      </div>

      <ExportHistoryPanel exportHistory={exportHistory} />
    </section>
  );
}

function ExportHistoryPanel({ exportHistory }: { exportHistory: QualityExportTaskResponse[] }) {
  const recent = exportHistory.slice(0, 10);
  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        暂无历史检测记录，完成一次扫描并生成导出后，记录会出现在这里。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          const tone =
            task.status === "done"
              ? "bg-emerald-50 text-emerald-700"
              : task.status === "failed"
                ? "bg-red-50 text-red-600"
                : task.status === "running"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600";
          const label =
            task.status === "done"
              ? "完成"
              : task.status === "failed"
                ? "失败"
                : task.status === "running"
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
                <span className="text-xs text-slate-400">{created ? created.toLocaleString("zh-CN", { hour12: false }) : "—"}</span>
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
