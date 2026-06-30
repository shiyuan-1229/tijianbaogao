"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";

import type { TaskResultViewModel } from "@/entities/tasks/types";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { buildMockTasks } from "@/features/tasks/lib/mock-tasks";
import { cn } from "@/shared/lib/cn";
import { useTasksStore } from "@/shared/store/tasks-store";
import { PageHeader } from "@/shared/ui/page-header";

type TasksShellProps = {
  preferredTaskId?: string;
  initialTasks?: TaskResultViewModel[];
  routeContext?: "overview" | "detail";
};

type TaskFilterValue = "all" | "daily" | "weekly";

const statusStyles = {
  running: "bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))]",
  success: "bg-emerald-50 text-emerald-900",
  warning: "bg-amber-50 text-amber-900",
} as const;

export function TasksShell({
  preferredTaskId,
  initialTasks,
  routeContext = "overview",
}: TasksShellProps) {
  const tasks = useTasksStore((state) => state.tasks);
  const replaceTasks = useTasksStore((state) => state.replaceTasks);
  const selectedTaskId = useTasksStore((state) => state.selectedTaskId);
  const selectTask = useTasksStore((state) => state.selectTask);

  const [query, setQuery] = useStateWithDefault("");
  const [selectedType, setSelectedType] =
    useStateWithDefault<TaskFilterValue>("all");

  useEffect(() => {
    if (tasks.length > 0) {
      return;
    }

    replaceTasks(initialTasks && initialTasks.length > 0 ? initialTasks : buildMockTasks());
  }, [initialTasks, replaceTasks, tasks.length]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesType =
        selectedType === "all" ? true : task.diagnosisType === selectedType;
      const matchesQuery =
        !normalizedQuery ||
        `${task.title} ${task.storeName} ${task.summary.summary}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [query, selectedType, tasks]);

  useEffect(() => {
    if (filteredTasks.length === 0) {
      if (selectedTaskId !== null) {
        selectTask(null);
      }
      return;
    }

    if (
      selectedTaskId &&
      filteredTasks.some((task) => task.id === selectedTaskId)
    ) {
      return;
    }

    const preferredTask = preferredTaskId
      ? filteredTasks.find((task) => task.id === preferredTaskId)
      : null;

    selectTask((preferredTask ?? filteredTasks[0]).id);
  }, [filteredTasks, preferredTaskId, selectTask, selectedTaskId]);

  const selectedTask =
    filteredTasks.find((task) => task.id === selectedTaskId) ?? null;

  const counts = {
    all: tasks.length,
    daily: tasks.filter((task) => task.diagnosisType === "daily").length,
    weekly: tasks.filter((task) => task.diagnosisType === "weekly").length,
  };

  const headerCopy =
    routeContext === "detail"
      ? {
          title: "证据详情",
          description:
            "聚焦查看当前诊断证据、关键发现和建议动作，再决定下一步要在对话工作区继续追问什么。",
        }
      : {
          title: "诊断证据中心",
          description:
            "先在这里核对诊断证据，再回到对话工作区继续追问、比较和沉淀行动方案。",
        };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="Tasks"
        title={headerCopy.title}
        description={headerCopy.description}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">任务收件箱</h2>
              <p className="text-sm text-muted-foreground">
                先看需要处理的任务，再进入结果与建议。
              </p>
            </div>

            <TaskFilters
              counts={counts}
              query={query}
              selectedType={selectedType}
              onQueryChange={setQuery}
              onTypeChange={setSelectedType}
            />

            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const active = task.id === selectedTaskId;

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => selectTask(task.id)}
                      className={cn(
                        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition",
                        active
                          ? "border-[rgb(var(--accent))] bg-[rgba(var(--accent),0.09)] shadow-[var(--shadow-soft)]"
                          : "border-border bg-white/65 hover:border-[rgb(var(--border-strong))]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-base font-medium text-foreground">
                            {task.title}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {task.summary.summary}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            statusStyles[task.status.tone],
                          )}
                        >
                          {task.status.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] px-4 py-5">
                <p className="text-sm font-medium text-foreground">
                  当前筛选条件下暂无诊断任务。
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">分析结果</h2>
              <p className="text-sm text-muted-foreground">
                聚焦关键发现、根因判断和建议动作。
              </p>
            </div>

            {selectedTask ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        当前状态
                      </p>
                      <h3 className="text-xl font-semibold text-foreground">
                        根据任务上下文生成的分析摘要
                      </h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {selectedTask.summary.summary}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        statusStyles[selectedTask.status.tone],
                      )}
                    >
                      {selectedTask.status.label}
                    </span>
                  </div>
                </div>

                <InfoBlock title="关键发现" items={selectedTask.highlights} />
                <InfoBlock title="根因分析" items={selectedTask.rootCauses} />
                <InfoBlock title="建议动作" items={selectedTask.recommendedActions} />

                <div className="rounded-[1.5rem] border border-white/70 bg-white/75 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">
                    继续追问入口
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    核对完证据后，回到对话工作区继续追问原因、时段差异或整改方案。
                  </p>
                  <Link
                    href="/agent"
                    className="mt-3 inline-flex rounded-full border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:border-[rgb(var(--accent))]"
                  >
                    回到对话工作区
                  </Link>
                </div>

                <Collapsible.Root className="rounded-[1.5rem] border border-border bg-white/70">
                  <Collapsible.Trigger className="flex w-full items-center justify-between px-4 py-4 text-left">
                    <span className="text-sm font-medium text-foreground">
                      查看详细过程
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Collapsible.Trigger>
                  <Collapsible.Content className="border-t border-border px-4 py-4">
                    <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                      {selectedTask.progress.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </Collapsible.Content>
                </Collapsible.Root>
              </div>
            ) : (
              <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] px-4 py-5">
                <p className="text-sm font-medium text-foreground">
                  选择一项任务后，这里会显示关键发现、根因和建议动作。
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-white/70 p-4">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

function useStateWithDefault<T>(initialValue: T) {
  const [value, setValue] = useState(initialValue);
  return [value, setValue] as const;
}
