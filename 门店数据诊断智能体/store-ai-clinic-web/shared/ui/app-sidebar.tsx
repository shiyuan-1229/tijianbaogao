"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileCheck2,
  FileOutput,
  FileSearch,
  ListChecks,
  Settings2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { primaryNav } from "@/shared/config/nav";
import { cn } from "@/shared/lib/cn";
import { AppNavLink } from "@/shared/ui/app-nav-link";

const navIcons = {
  "/quality": ClipboardCheck,
  "/tasks": ListChecks,
  "/agent": FileSearch,
  "/brands": UserCheck,
  "/knowledge": ShieldCheck,
  "/settings": FileOutput,
} as const;

const recentBatches = [
  { id: "batch-20250522", label: "第三批体检报告" },
  { id: "batch-history", label: "历史对比样本" },
];

export function AppSidebar() {
  const pathname = usePathname() ?? "/quality";

  return (
    <aside className="shell-sidebar flex h-full min-h-screen w-full flex-col bg-white">
      <div className="border-b border-[#e4e9ef] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0b9a9a] text-white shadow-[var(--shadow-glow)]">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#151922]">体检报告质检</p>
            <p className="mt-0.5 truncate text-xs text-[#687384]">数据合规筛查工作台</p>
          </div>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
        {primaryNav.map((item) => {
          const Icon = navIcons[item.href];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <AppNavLink
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[#e6f7f7] text-[#0b8b8b]"
                  : "text-[#4b5565] hover:bg-[#f2f5f8] hover:text-[#151922]",
              )}
              pendingClassName="bg-[#e6f7f7] text-[#0b8b8b]"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </AppNavLink>
          );
        })}
      </nav>

      <section className="border-t border-[#e4e9ef] px-3 py-4">
        <p className="px-3 text-xs font-semibold text-[#687384]">最近数据集</p>
        <div className="mt-3 space-y-1">
          {recentBatches.map((batch) => (
            <Link
              key={batch.id}
              href="/quality"
              className="block rounded-md px-3 py-2 text-sm text-[#4b5565] hover:bg-[#f2f5f8] hover:text-[#151922]"
            >
              {batch.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="border-t border-[#e4e9ef] p-3">
        <AppNavLink
          href="/settings"
          className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#4b5565] hover:bg-[#f2f5f8] hover:text-[#151922]"
          pendingClassName="bg-[#e6f7f7] text-[#0b8b8b]"
        >
          <Settings2 className="h-4 w-4" />
          系统管理
        </AppNavLink>
      </div>
    </aside>
  );
}