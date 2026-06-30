import { QueryClient } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import {
  useConversationsQuery,
  useCreateConversationMutation,
} from "@/features/conversations/hooks/use-conversations-query";

function QueryProbe({ storeId }: { storeId?: string }) {
  const query = useConversationsQuery(storeId);

  return (
    <div>
      <span data-testid="status">{query.status}</span>
      <span data-testid="count">{query.data?.length ?? 0}</span>
      <span data-testid="title">{query.data?.[0]?.sessionTitle ?? ""}</span>
    </div>
  );
}

function CreateProbe() {
  const mutation = useCreateConversationMutation();

  return (
    <button
      type="button"
      onClick={() =>
        mutation.mutate({
          brand_id: "brand-acme",
          store_id: "hangzhou-xihu",
          entry_mode: "manual",
          initial_question: "分析杭州西湖店日报",
        })
      }
    >
      create
    </button>
  );
}

function renderWithProviders(node: ReactNode) {
  return render(<Providers>{node}</Providers>);
}

describe("useConversationsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads conversations through QueryClientProvider and preserves store_id filtering", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            session_id: "ses_001",
            session_title: "杭州西湖店日报诊断",
            title_source: "system",
            status: "active",
            entry_mode: "manual",
            brand_id: "brand-acme",
            store_id: "hangzhou-xihu",
          },
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<QueryProbe storeId="hangzhou-xihu" />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations?store_id=hangzhou-xihu",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("title")).toHaveTextContent("杭州西湖店日报诊断");
  });

  it("throws for invalid conversation payloads instead of creating empty ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            session_title: "缺少 ID 的错误会话",
            status: "active",
            entry_mode: "manual",
            brand_id: "brand-acme",
            store_id: "hangzhou-xihu",
          },
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<QueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
  });
});

describe("useCreateConversationMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a typed create payload and invalidates conversations queries", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClientSpy = vi
      .spyOn(QueryClient.prototype, "invalidateQueries")
      .mockImplementation(invalidateQueries);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          session_id: "ses_new_001",
          session_title: "杭州西湖店日报诊断",
          title_source: "system",
          status: "active",
          entry_mode: "manual",
          brand_id: "brand-acme",
          store_id: "hangzhou-xihu",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<CreateProbe />);

    await act(async () => {
      screen.getByRole("button", { name: "create" }).click();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/conversations",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.body).toBe(
      JSON.stringify({
        brand_id: "brand-acme",
        store_id: "hangzhou-xihu",
        entry_mode: "manual",
        initial_question: "分析杭州西湖店日报",
      }),
    );

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith({
        queryKey: ["conversations"],
      });
    });
  });
});
