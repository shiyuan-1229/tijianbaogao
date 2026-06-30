"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Building2, FileText, GitBranch, ShieldCheck } from "lucide-react";

import { BrandProfileForm } from "@/features/brands/components/brand-profile-form";
import { FieldMappingTab } from "@/features/brands/components/field-mapping-tab";
import { RulesTab } from "@/features/brands/components/rules-tab";
import { TemplatesTab } from "@/features/brands/components/templates-tab";
import { cn } from "@/shared/lib/cn";
import { useBrandsStore, type BrandTab } from "@/shared/store/brands-store";
import { PageHeader } from "@/shared/ui/page-header";

const tabs: Array<{
  value: BrandTab;
  label: string;
  icon: typeof Building2;
}> = [
  { value: "profile", label: "品牌档案", icon: Building2 },
  { value: "templates", label: "模板", icon: FileText },
  { value: "field-mapping", label: "字段映射", icon: GitBranch },
  { value: "diagnosis-rules", label: "诊断规则", icon: ShieldCheck },
];

export function BrandsShell() {
  const activeTab = useBrandsStore((state) => state.activeTab);
  const setActiveTab = useBrandsStore((state) => state.setActiveTab);
  const profile = useBrandsStore((state) => state.profile);
  const templates = useBrandsStore((state) => state.templates);
  const rules = useBrandsStore((state) => state.rules);
  const mappingCount = useBrandsStore((state) => state.fieldMappings.length);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        eyebrow="品牌"
        title="让 AI 先理解你的品牌口径"
        description="这些配置会直接影响 AI 的判断"
        actions={
          <>
            <div className="rounded-full border border-border bg-white/75 px-4 py-2 text-sm text-muted-foreground">
              {profile.name} · {templates.length} 个分析模板
            </div>
            <button
              type="button"
              className="rounded-full bg-[rgb(var(--accent))] px-4 py-2 text-sm font-medium text-[rgb(var(--accent-foreground))] shadow-[var(--shadow-soft)]"
            >
              保存口径调整
            </button>
          </>
        }
      />

      <Tabs.Root
        className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as BrandTab)}
      >
        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">配置入口</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                分别定义品牌背景、复用模板、报表映射和诊断规则，让 AI 在同一个口径下完成分析。
              </p>
            </div>
            <Tabs.List aria-label="品牌编辑分区" className="mt-4 flex flex-col gap-2">
              {tabs.map(({ value, label, icon: Icon }) => (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all outline-none",
                    "data-[state=active]:border-[rgb(var(--border-strong))] data-[state=active]:bg-[rgb(var(--accent))] data-[state=active]:text-[rgb(var(--accent-foreground))] data-[state=active]:shadow-[var(--shadow-soft)]",
                    "hover:bg-white focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))]/40",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
            <h2 className="text-sm font-semibold text-foreground">这些配置会带来怎样的影响</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                AI 已经可以按照 {profile.industry} 品牌的经营背景来理解数据，并结合 {rules.length} 条诊断规则和 {mappingCount} 个关键字段映射来判断异常。
              </p>
              <div className="rounded-2xl bg-[rgb(var(--surface-secondary))] px-4 py-3">
                如果最近的诊断结果不够符合你的业务判断，可以先从这四类配置入口回看 AI 的判断基线。
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-4">
          <Tabs.Content value="profile" className="outline-none">
            <BrandProfileForm />
          </Tabs.Content>
          <Tabs.Content value="templates" className="outline-none">
            <TemplatesTab />
          </Tabs.Content>
          <Tabs.Content value="field-mapping" className="outline-none">
            <FieldMappingTab />
          </Tabs.Content>
          <Tabs.Content value="diagnosis-rules" className="outline-none">
            <RulesTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
