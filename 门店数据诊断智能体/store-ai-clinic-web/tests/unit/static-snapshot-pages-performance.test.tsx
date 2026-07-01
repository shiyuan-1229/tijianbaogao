import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const loadDefaultQualityDatasetMock = vi.hoisted(() => vi.fn());
const batchOverviewImportMock = vi.hoisted(() => vi.fn());
const exportHistoryFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quality/lib/default-dataset", () => ({
  loadDefaultQualityDataset: loadDefaultQualityDatasetMock,
}));

vi.mock("@/features/quality/components/batch-overview", () => {
  batchOverviewImportMock();
  return {
    BatchDetectionOverview: () => <div>Batch overview loaded</div>,
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  exportHistoryFetchMock.mockReset();
});

function flushEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("static snapshot workspace pages", () => {
  it("does not block agent, manual review, or rule library first paint on dataset scanning, exports, or chart code", async () => {
    vi.stubGlobal("fetch", exportHistoryFetchMock);
    const [{ default: AgentPage }, { default: BrandsPage }, { default: KnowledgePage }] = await Promise.all([
      import("@/app/(workspace)/agent/page"),
      import("@/app/(workspace)/brands/page"),
      import("@/app/(workspace)/knowledge/page"),
    ]);

    render(await AgentPage());
    expect(screen.getByRole("heading", { level: 1, name: "单报告详情" })).toBeInTheDocument();

    render(await BrandsPage());
    expect(screen.getByRole("heading", { level: 1, name: "人工复核" })).toBeInTheDocument();

    render(await KnowledgePage());
    expect(screen.getByRole("heading", { level: 1, name: "规则库" })).toBeInTheDocument();

    await flushEffects();

    expect(loadDefaultQualityDatasetMock).not.toHaveBeenCalled();
    expect(exportHistoryFetchMock).not.toHaveBeenCalled();
    expect(batchOverviewImportMock).not.toHaveBeenCalled();
  });

  it("does not block screenshot-style issue and detail routes on dataset scanning, exports, or chart code", async () => {
    vi.stubGlobal("fetch", exportHistoryFetchMock);
    const [{ default: TasksPage }, { default: TaskDetailPage }, { default: AgentSessionPage }] = await Promise.all([
      import("@/app/(workspace)/tasks/page"),
      import("@/app/(workspace)/tasks/[taskId]/page"),
      import("@/app/(workspace)/agent/[sessionId]/page"),
    ]);

    render(await TasksPage());
    expect(screen.getByRole("heading", { level: 1, name: "问题清单" })).toBeInTheDocument();

    render(await TaskDetailPage({ params: Promise.resolve({ taskId: "demo-task" }) }));
    expect(screen.getAllByRole("heading", { level: 1, name: "单报告详情" }).length).toBeGreaterThanOrEqual(1);

    render(await AgentSessionPage({ params: Promise.resolve({ sessionId: "demo-session" }) }));
    expect(screen.getAllByRole("heading", { level: 1, name: "单报告详情" }).length).toBeGreaterThanOrEqual(2);

    await flushEffects();

    expect(loadDefaultQualityDatasetMock).not.toHaveBeenCalled();
    expect(exportHistoryFetchMock).not.toHaveBeenCalled();
    expect(batchOverviewImportMock).not.toHaveBeenCalled();
  });
});