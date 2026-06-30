import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const loadDefaultQualityDatasetMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quality/lib/default-dataset", () => ({
  loadDefaultQualityDataset: loadDefaultQualityDatasetMock,
}));

describe("static snapshot workspace pages", () => {
  it("does not block agent, manual review, or rule library first paint on dataset scanning", async () => {
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

    expect(loadDefaultQualityDatasetMock).not.toHaveBeenCalled();
  });
});