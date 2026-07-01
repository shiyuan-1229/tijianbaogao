import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SettingsPage from "@/app/(workspace)/settings/page";

describe("settings page", () => {
  it("renders the real export workspace without loading static demo data", async () => {
    render(await SettingsPage());

    expect(screen.getByRole("heading", { level: 1, name: "鎶ュ憡瀵煎嚭" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "棰勮浜や粯鍖? })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "瀵煎嚭缁撴灉" })).toBeInTheDocument();
    expect(screen.getByText("浜や粯鐗╅€夋嫨")).toBeInTheDocument();
    expect(screen.getByText("瀵煎嚭棰勮")).toBeInTheDocument();
    expect(screen.getByText("瀵煎嚭璁板綍")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "鐢熸垚浜や粯鍖? })).toBeInTheDocument();
  });
});
