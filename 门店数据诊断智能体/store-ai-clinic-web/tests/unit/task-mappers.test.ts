import { describe, expect, it } from "vitest";

import { mapDiagnosisRunResponseToTaskResult } from "@/entities/tasks/mappers";

describe("task mappers", () => {
  it("maps diagnosis API response into task result view model", () => {
    const result = mapDiagnosisRunResponseToTaskResult({
      task_id: "task-001",
      store_id: "HZ-West",
      diagnosis_type: "daily",
      graph_stage: "diagnose",
      diagnosis_source: "llm",
      diagnosis_error: null,
      diagnosis_draft: {
        title: "Traffic weakened after lunch",
        summary: "Afternoon conversion softened for two hours.",
        next_action: "Check staffing and queue handoff after 13:00.",
      },
    });

    expect(result.id).toBe("task-001");
    expect(result.summary.title).toBe("Traffic weakened after lunch");
    expect(result.status.source).toBe("llm");
  });
});
