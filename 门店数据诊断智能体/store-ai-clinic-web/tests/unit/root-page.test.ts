import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import RootPage from "@/app/page";

describe("root page", () => {
  it("redirects the bare app URL to the quality workspace", () => {
    expect(() => RootPage()).toThrow("NEXT_REDIRECT:/quality");
    expect(redirectMock).toHaveBeenCalledWith("/quality");
  });
});
