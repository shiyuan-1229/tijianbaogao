import { beforeEach, describe, expect, it, vi } from "vitest";

const ROUTE_TIMEOUT_MS = 8000;

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/shared/api/server-client", () => ({
  serverApiClient: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

describe("conversation CRUD routes", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it("lists conversations from the backend conversation service", async () => {
    getMock.mockResolvedValue([
      {
        id: "conv_001",
        title: "Hangzhou West Lake Store Analysis",
        status: "active",
      },
    ]);

    const { GET } = await import("@/app/api/conversations/route");
    const response = await GET(new Request("http://localhost/api/conversations"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("/api/conversations", {
      cache: "no-store",
      timeoutMs: ROUTE_TIMEOUT_MS,
    });
    expect(body).toEqual([
      {
        id: "conv_001",
        title: "Hangzhou West Lake Store Analysis",
        status: "active",
      },
    ]);
  });

  it("forwards the store_id filter when listing conversations", async () => {
    getMock.mockResolvedValue([]);

    const { GET } = await import("@/app/api/conversations/route");
    const response = await GET(
      new Request("http://localhost/api/conversations?store_id=store-a"),
    );

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("/api/conversations?store_id=store-a", {
      cache: "no-store",
      timeoutMs: ROUTE_TIMEOUT_MS,
    });
  });

  it("creates conversations through the backend conversation service", async () => {
    postMock.mockResolvedValue({
      id: "conv_001",
      title: "Hangzhou West Lake Store Analysis",
      status: "active",
    });

    const { POST } = await import("@/app/api/conversations/route");
    const response = await POST(
      new Request("http://localhost/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Hangzhou West Lake Store Analysis",
          store_id: "hangzhou-xihu",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(postMock).toHaveBeenCalledWith(
      "/api/conversations",
      {
        title: "Hangzhou West Lake Store Analysis",
        store_id: "hangzhou-xihu",
      },
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.id).toBe("conv_001");
  });

  it("updates a conversation through the backend conversation service", async () => {
    patchMock.mockResolvedValue({
      id: "conv_001",
      title: "Renamed Conversation",
      status: "archived",
    });

    const { PATCH } = await import("@/app/api/conversations/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/conversations/conv_001", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Renamed Conversation",
          status: "archived",
        }),
      }),
      { params: Promise.resolve({ id: "conv_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(patchMock).toHaveBeenCalledWith(
      "/api/conversations/conv_001",
      {
        title: "Renamed Conversation",
        status: "archived",
      },
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body).toEqual({
      id: "conv_001",
      title: "Renamed Conversation",
      status: "archived",
    });
  });

  it("deletes a conversation through the backend conversation service", async () => {
    deleteMock.mockResolvedValue(undefined);

    const { DELETE } = await import("@/app/api/conversations/[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/conversations/conv_001", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "conv_001" }) },
    );

    expect(response.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith("/api/conversations/conv_001", {
      cache: "no-store",
      timeoutMs: ROUTE_TIMEOUT_MS,
    });
  });
});

describe("conversation session routes", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it("lists sessions from the backend conversation service", async () => {
    getMock.mockResolvedValue([
      {
        session_id: "ses_001",
        session_title: "Hangzhou West Lake Store Analysis",
        status: "active",
        entry_mode: "manual",
        brand_id: "brand-acme",
        store_id: "hangzhou-xihu",
      },
    ]);

    const { GET } = await import("@/app/api/conversations/sessions/route");
    const response = await GET(
      new Request(
        "http://localhost/api/conversations/sessions?store_id=hangzhou-xihu",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith(
      "/api/conversations/sessions?store_id=hangzhou-xihu",
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body).toEqual([
      {
        session_id: "ses_001",
        session_title: "Hangzhou West Lake Store Analysis",
        status: "active",
        entry_mode: "manual",
        brand_id: "brand-acme",
        store_id: "hangzhou-xihu",
      },
    ]);
  });

  it("creates sessions through the backend conversation service", async () => {
    postMock.mockResolvedValue({
      session_id: "ses_001",
      session_title: "Hangzhou West Lake Store Analysis",
      status: "active",
      entry_mode: "manual",
      brand_id: "brand-acme",
      store_id: "hangzhou-xihu",
    });

    const { POST } = await import("@/app/api/conversations/sessions/route");
    const response = await POST(
      new Request("http://localhost/api/conversations/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_id: "brand-acme",
          store_id: "hangzhou-xihu",
          entry_mode: "manual",
          initial_question: "Analyze Hangzhou West Lake store",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(postMock).toHaveBeenCalledWith(
      "/api/conversations/sessions",
      {
        brand_id: "brand-acme",
        store_id: "hangzhou-xihu",
        entry_mode: "manual",
        initial_question: "Analyze Hangzhou West Lake store",
      },
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.session_id).toBe("ses_001");
  });

  it("returns a friendly timeout error when session creation is aborted", async () => {
    postMock.mockRejectedValue(new Error("This operation was aborted"));

    const { POST } = await import("@/app/api/conversations/sessions/route");
    const response = await POST(
      new Request("http://localhost/api/conversations/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_id: "brand-acme",
          store_id: "hangzhou-xihu",
          entry_mode: "manual",
          initial_question: "Analyze Hangzhou West Lake store",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      detail: "Conversation session creation timed out.",
    });
  });
});

describe("conversation message route", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it("loads a single session from the backend conversation service", async () => {
    getMock.mockResolvedValue({
      session_id: "ses_001",
      session_title: "Hangzhou West Lake Store Analysis",
      status: "active",
      entry_mode: "manual",
      brand_id: "brand-acme",
      store_id: "hangzhou-xihu",
    });

    const { GET } = await import(
      "@/app/api/conversations/sessions/[sessionId]/route"
    );
    const response = await GET(
      new Request("http://localhost/api/conversations/sessions/ses_001"),
      { params: Promise.resolve({ sessionId: "ses_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith(
      "/api/conversations/sessions/ses_001",
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.session_id).toBe("ses_001");
  });

  it("loads message history from the backend conversation service", async () => {
    getMock.mockResolvedValue([
      {
        message_id: "msg_001",
        role: "user",
        message_type: "question",
        content_text: "Why did it drop?",
      },
      {
        message_id: "msg_002",
        role: "assistant",
        message_type: "answer",
        content_text: "Traffic is down 8%.",
      },
    ]);

    const { GET } = await import(
      "@/app/api/conversations/sessions/[sessionId]/messages/route"
    );
    const response = await GET(
      new Request("http://localhost/api/conversations/sessions/ses_001/messages"),
      { params: Promise.resolve({ sessionId: "ses_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith(
      "/api/conversations/sessions/ses_001/messages",
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body).toHaveLength(2);
    expect(body[1].content_text).toBe("Traffic is down 8%.");
  });

  it("proxies follow-up messages to the backend conversation service", async () => {
    postMock.mockResolvedValue({
      assistant_message: "Traffic is down 8%.",
      followup_suggestions: [
        {
          intent: "time_drilldown",
          text: "Check which hours declined the most",
          suggestion_type: "deepen",
        },
      ],
    });

    const { POST } = await import(
      "@/app/api/conversations/sessions/[sessionId]/messages/route"
    );
    const response = await POST(
      new Request("http://localhost/api/conversations/sessions/ses_001/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Why did it drop?",
        }),
      }),
      { params: Promise.resolve({ sessionId: "ses_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith(
      "/api/conversations/sessions/ses_001/messages",
      { message: "Why did it drop?" },
      { cache: "no-store", timeoutMs: ROUTE_TIMEOUT_MS },
    );
    expect(body.assistant_message).toBe("Traffic is down 8%.");
  });

  it("returns a friendly timeout error when posting a message is aborted", async () => {
    postMock.mockRejectedValue(new Error("This operation was aborted"));

    const { POST } = await import(
      "@/app/api/conversations/sessions/[sessionId]/messages/route"
    );
    const response = await POST(
      new Request("http://localhost/api/conversations/sessions/ses_001/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Why did it drop?",
        }),
      }),
      { params: Promise.resolve({ sessionId: "ses_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      detail: "Conversation message request timed out.",
    });
  });
});
