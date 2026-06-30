"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { AlertTriangle, CheckCircle2, ChevronDown, LoaderCircle, Sparkles } from "lucide-react";

import { UploadDropzone } from "@/features/agent/components/upload-dropzone";
import { useAgentSubmit } from "@/features/agent/hooks/use-agent-submit";
import type { AgentTimelineEvent } from "@/entities/agent/types";
import { cn } from "@/shared/lib/cn";
import { useAgentSessionStore } from "@/shared/store/agent-session-store";

const defaultTimeline: AgentTimelineEvent[] = [
  { id: "step-upload", label: "上传日报或周报", state: "pending" },
  { id: "step-clean", label: "整理输入信息", state: "pending" },
  { id: "step-diagnose", label: "AI 分析经营表现", state: "pending" },
  { id: "step-report", label: "生成诊断建议", state: "pending" },
];

const eventIcon = {
  pending: null,
  running: LoaderCircle,
  done: CheckCircle2,
  error: AlertTriangle,
} as const;

const eventStyles = {
  pending: "border-border bg-[rgb(var(--surface-secondary))] text-muted-foreground",
  running: "border-[rgb(var(--accent))]/30 bg-[rgba(var(--accent),0.08)] text-foreground",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

export function AgentShell() {
  const draft = useAgentSessionStore((state) => state.draft);
  const setDraft = useAgentSessionStore((state) => state.setDraft);
  const latestResult = useAgentSessionStore((state) => state.latestResult);
  const timeline = useAgentSessionStore((state) => state.timeline);
  const { errorMessage, files, isSubmitting, onFileRemove, onFilesSelected, submit } =
    useAgentSubmit();

  const visibleTimeline = timeline.length > 0 ? timeline : defaultTimeline;

  return (
    <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
      <section className="space-y-5 rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--accent),0.12)] px-3 py-1 text-sm text-[rgb(var(--accent))]">
            <Sparkles className="h-4 w-4" />
            AI 协作分析
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              与 AI 分析助手协作
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              上传日报、周报或补充问题，AI 会整理并发起分析。
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
            <p className="text-sm font-medium text-foreground">今天想重点看什么？</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              可以直接提问，也可以补充门店活动、天气、排班等背景，帮助 AI 更快定位问题。
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
            <p className="text-sm font-medium text-foreground">支持的输入</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              日报、周报、SOP 补充说明，或一段你希望 AI 重点追踪的经营变化。
            </p>
          </article>
        </div>

        <UploadDropzone
          files={files}
          isSubmitting={isSubmitting}
          onFileRemove={onFileRemove}
          onFilesSelected={onFilesSelected}
        />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">补充分析目标</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="输入你想了解的问题，或补充这次分析要关注的经营变化"
            className="min-h-40 w-full rounded-[1.5rem] border border-border bg-white/75 px-4 py-4 text-sm leading-6 text-foreground outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgba(var(--accent),0.18)]"
          />
        </label>

        {errorMessage ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[rgb(var(--accent))] px-5 py-3 text-sm font-medium text-[rgb(var(--accent-foreground))] shadow-[var(--shadow-soft)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "分析中..." : "开始分析"}
          </button>
          <p className="text-sm text-muted-foreground">
            你可以连续上传文件，再结合一句经营问题发起诊断。
          </p>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">当前分析</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                默认只展示对决策有帮助的进展和结论。
              </p>
            </div>

            <div className="space-y-3">
              {visibleTimeline.map((event) => {
                const Icon = eventIcon[event.state];

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-[1.25rem] border px-4 py-3",
                      eventStyles[event.state],
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {Icon ? (
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              event.state === "running" ? "animate-spin" : "",
                            )}
                          />
                        ) : (
                          <span className="block h-2.5 w-2.5 rounded-full bg-current/45" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.detail ? (
                          <p className="text-sm leading-6 text-current/80">{event.detail}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          {latestResult ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">最新结论</p>
                <h3 className="text-xl font-semibold text-foreground">
                  {latestResult.summary.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {latestResult.summary.summary}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[rgb(var(--surface-secondary))] p-4">
                <p className="text-sm font-medium text-foreground">建议动作</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {latestResult.summary.nextAction}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">结果会显示在这里</p>
              <p className="text-sm leading-6 text-muted-foreground">
                发起分析后，你会先看到进度，再看到关键发现、原因判断和建议动作。
              </p>
            </div>
          )}
        </section>

        <Collapsible.Root className="rounded-[2rem] border border-white/70 bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
          <Collapsible.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left">
            <span className="text-sm font-medium text-foreground">查看详细过程</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Collapsible.Trigger>
          <Collapsible.Content className="border-t border-white/70 px-5 py-4">
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              {visibleTimeline.map((event) => (
                <li key={`${event.id}:detail`}>
                  <span className="font-medium text-foreground">{event.label}</span>
                  {event.detail ? `：${event.detail}` : "。"}
                </li>
              ))}
            </ul>
          </Collapsible.Content>
        </Collapsible.Root>
      </aside>
    </div>
  );
}
