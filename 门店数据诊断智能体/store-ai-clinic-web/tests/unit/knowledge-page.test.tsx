import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import KnowledgePage from "@/app/(workspace)/knowledge/page";

describe("knowledge page", () => {
  it("renders the rule library shell without static demo records", async () => {
    render(await KnowledgePage());

    expect(screen.getByRole("heading", { level: 1, name: "瑙勫垯搴? })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "瀵煎叆闇€姹傛枃妗? })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "鏂板瑙勫垯" })).toBeInTheDocument();
    expect(screen.queryByText("R-FILE-001")).not.toBeInTheDocument();
    expect(screen.queryByText("R-PRIVACY-003")).not.toBeInTheDocument();
  });
});
