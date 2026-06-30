"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileOutput,
  FileSearch,
  ListChecks,
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

export function AppMobileNav() {
  const pathname = usePathname() ?? "/quality";

  return (
    <div className="border-b border-[#dfe4ea] bg-white lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#151922]">体检报告质检</p>
          <p className="mt-0.5 truncate text-xs text-[#687384]">数据合规筛查工作台</p>
        </div>
        <Link
          href="/quality"
          className="shrink-0 rounded-md bg-[#0b9a9a] px-3 py-2 text-xs font-semibold text-white"
        >
          数据集
        </Link>
      </div>
      <nav aria-label="Compact primary" className="flex gap-2 overflow-x-auto px-3 pb-3">
        {primaryNav.map((item) => {
          const Icon = navIcons[item.href];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <AppNavLink
              key={item.href}
              href={item.href}
              aria-label={`${item.label}页面`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-[#0b9a9a] bg-[#e6f7f7] text-[#0b8b8b]"
                  : "border-[#d5dce5] bg-white text-[#4b5565] hover:bg-[#f7f9fb] hover:text-[#151922]",
              )}
              pendingClassName="border-[#0b9a9a] bg-[#e6f7f7] text-[#0b8b8b]"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </AppNavLink>
          );
        })}
      </nav>
    </div>
  );
}