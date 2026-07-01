import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import QualityPage from "@/app/(workspace)/quality/page";

describe("quality page", () => {
  it("renders the batch detection workspace and waits for real data imports", async () => {
    render(await QualityPage());

    expect(screen.getByRole("heading", { name: "鎵归噺妫€娴嬪伐浣滃彴" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "瀵煎叆浣撴鎶ュ憡鏁版嵁" })).toBeInTheDocument();
    expect(screen.getByLabelText("閫夋嫨鏂囦欢澶瑰鍏?)).toBeInTheDocument();
    expect(screen.getByLabelText("閫夋嫨寰呮竻娲楁枃浠?)).toBeInTheDocument();
    expect(screen.getByText("浣撴鏁版嵁璐ㄩ噺鍒嗗竷")).toBeInTheDocument();
    expect(screen.getByText("骞撮緞娈佃鐩?vs 鍧囪　鐩爣")).toBeInTheDocument();
    expect(screen.getByText("鎬у埆姣斾緥锛堢洰鏍?1:1锛?)).toBeInTheDocument();
    expect(screen.getByText("鎶ュ憡椤垫暟鍒嗗竷")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "瀵煎嚭缁撴灉" })).toBeInTheDocument();
  });
});
