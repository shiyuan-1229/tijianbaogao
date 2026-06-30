import { NextResponse } from "next/server";

import { buildMockTask } from "@/features/tasks/lib/mock-tasks";

type TaskEventsRouteContext = {
  params: Promise<{ taskId: string }>;
};

type TaskTimelineEvent = {
  id: string;
  state: "done" | "running" | "error";
  label: string;
  detail: string;
};

type TaskEventsResponse = {
  task_id: string;
  data_source: "mock";
  backend_available: false;
  events: TaskTimelineEvent[];
  note: string;
};

function buildTaskEvents(taskId: string): TaskTimelineEvent[] {
  const task = buildMockTask(taskId);
  const finalEvent =
    task.status.error === null
      ? {
          id: `${task.id}:completed`,
          state: "done" as const,
          label: "Diagnosis completed",
          detail: task.summary.nextAction,
        }
      : {
          id: `${task.id}:blocked`,
          state: "error" as const,
          label: "Diagnosis blocked",
          detail: task.status.error,
        };

  return [
    {
      id: `${task.id}:queued`,
      state: "done",
      label: "Task queued",
      detail: `Created for store ${task.storeId} with ${task.diagnosisType} cadence.`,
    },
    {
      id: `${task.id}:validated`,
      state: "done",
      label: "Dataset checks finished",
      detail: `Workflow source ${task.status.source ?? "pending"} cleared the pre-diagnosis checks.`,
    },
    {
      id: `${task.id}:graph`,
      state: task.status.error ? "error" : "done",
      label: "Diagnosis graph advanced",
      detail: `Current workflow stage: ${task.stage}.`,
    },
    finalEvent,
  ];
}

export async function GET(
  _request: Request,
  { params }: TaskEventsRouteContext,
) {
  const { taskId } = await params;
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    return NextResponse.json(
      { detail: "Task id is required." },
      { status: 400 },
    );
  }

  const response: TaskEventsResponse = {
    task_id: normalizedTaskId,
    data_source: "mock",
    backend_available: false,
    events: buildTaskEvents(normalizedTaskId),
    note: "Task timeline events are mock-backed until the Python backend exposes a workflow events feed.",
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "X-Task-Events-Data-Source": "mock",
    },
  });
}
