import { NextResponse } from "next/server";

import { buildMockTask } from "@/features/tasks/lib/mock-tasks";

type TaskRouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, { params }: TaskRouteContext) {
  const { taskId } = await params;
  return NextResponse.json(buildMockTask(taskId), {
    status: 200,
    headers: {
      "X-Tasks-Data-Source": "mock",
    },
  });
}
