"use client";

import { useBrandsStore } from "@/shared/store/brands-store";

export function BrandProfileForm() {
  const profile = useBrandsStore((state) => state.profile);
  const updateProfile = useBrandsStore((state) => state.updateProfile);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-foreground">品牌档案</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          定义智能体在为该品牌生成诊断前应默认理解的基础经营背景。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">品牌名称</span>
          <input
            value={profile.name}
            onChange={(event) => updateProfile("name", event.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">行业</span>
          <input
            value={profile.industry}
            onChange={(event) => updateProfile("industry", event.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">主要区域</span>
          <input
            value={profile.region}
            onChange={(event) => updateProfile("region", event.target.value)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">默认频率</span>
          <select
            value={profile.defaultCadence}
            onChange={(event) =>
              updateProfile("defaultCadence", event.target.value)
            }
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          >
            <option value="日诊断">日诊断</option>
            <option value="周诊断">周诊断</option>
          </select>
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-foreground">语气与结论框架</span>
          <textarea
            value={profile.voice}
            onChange={(event) => updateProfile("voice", event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-[rgb(var(--border-strong))]"
          />
        </label>
      </div>
    </section>
  );
}
