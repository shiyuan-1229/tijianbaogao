"use client";

import { useBrandsStore } from "@/shared/store/brands-store";

export function FieldMappingTab() {
  const fieldMappings = useBrandsStore((state) => state.fieldMappings);
  const updateFieldMapping = useBrandsStore((state) => state.updateFieldMapping);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <h2 className="text-xl font-semibold text-foreground">字段映射</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        将门店上传报表中的字段统一映射到诊断流程所需的标准字段。
      </p>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-border">
        <div className="grid grid-cols-[1fr_1fr_120px] gap-3 bg-[rgb(var(--surface-secondary))] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span>来源字段</span>
          <span>映射到</span>
          <span>必填</span>
        </div>
        <div className="divide-y divide-border bg-white">
          {fieldMappings.map((mapping) => (
            <div
              key={mapping.id}
              className="grid grid-cols-[1fr_1fr_120px] gap-3 px-4 py-4"
            >
              <input
                value={mapping.sourceField}
                onChange={(event) =>
                  updateFieldMapping(mapping.id, {
                    sourceField: event.target.value,
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-[rgb(var(--border-strong))]"
              />
              <input
                value={mapping.targetField}
                onChange={(event) =>
                  updateFieldMapping(mapping.id, {
                    targetField: event.target.value,
                  })
                }
                className="rounded-2xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-[rgb(var(--border-strong))]"
              />
              <label className="flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={mapping.required}
                  onChange={(event) =>
                    updateFieldMapping(mapping.id, {
                      required: event.target.checked,
                    })
                  }
                />
                必填
              </label>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
