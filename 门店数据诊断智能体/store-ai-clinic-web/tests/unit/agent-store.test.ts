import { describe, expect, it } from "vitest";

import { useAgentSessionStore } from "@/shared/store/agent-session-store";

describe("agent session store", () => {
  it("appends timeline events in order", () => {
    const { addTimelineEvent, resetSession } = useAgentSessionStore.getState();

    resetSession();
    addTimelineEvent({ id: "evt-1", label: "Upload received", state: "done" });
    addTimelineEvent({
      id: "evt-2",
      label: "Diagnosis started",
      state: "running",
    });

    const events = useAgentSessionStore.getState().timeline;

    expect(events.map((item) => item.id)).toEqual(["evt-1", "evt-2"]);
  });
});
