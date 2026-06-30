import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ConversationSessionSummary } from "@/entities/conversations/types";
import { ConversationSidebar } from "@/features/conversations/components/conversation-sidebar";

const sessions: ConversationSessionSummary[] = [
  {
    sessionId: "ses_001",
    sessionTitle: "杭州西湖店午市流量诊断",
    status: "active",
    storeId: "hangzhou-xihu",
  },
  {
    sessionId: "ses_002",
    sessionTitle: "上海静安店复购问题排查",
    status: "active",
    storeId: "shanghai-jingan",
  },
];

describe("ConversationSidebar", () => {
  it("renders the sidebar empty hint when there are no conversations", () => {
    render(
      <ConversationSidebar
        sessions={[]}
        activeSessionId={null}
        onCreateConversation={vi.fn()}
      />,
    );

    expect(
      screen.getByText("还没有历史会话。你可以先创建一个诊断会话开始分析。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ 新建会话" })).toBeInTheDocument();
  });

  it("renders the new conversation button in the sidebar header", () => {
    render(
      <ConversationSidebar
        sessions={sessions}
        activeSessionId={sessions[0].sessionId}
        onCreateConversation={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "+ 新建会话" })).toBeInTheDocument();
  });

  it("renders conversation item titles", () => {
    render(
      <ConversationSidebar
        sessions={sessions}
        activeSessionId={sessions[0].sessionId}
        onCreateConversation={vi.fn()}
      />,
    );

    expect(screen.getByText("杭州西湖店午市流量诊断")).toBeInTheDocument();
    expect(screen.getByText("上海静安店复购问题排查")).toBeInTheDocument();
  });

  it("renders a conversation actions trigger for each item", () => {
    render(
      <ConversationSidebar
        sessions={sessions}
        activeSessionId={sessions[0].sessionId}
        onCreateConversation={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button", { name: "会话操作" })).toHaveLength(
      sessions.length,
    );
  });
});
