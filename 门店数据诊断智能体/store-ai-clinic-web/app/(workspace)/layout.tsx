import type { ReactNode } from "react";

import { AppMobileNav } from "@/shared/ui/app-mobile-nav";
import { AppSidebar } from "@/shared/ui/app-sidebar";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <div className="shell-bg min-h-screen text-foreground">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[248px] shrink-0 lg:block">
          <AppSidebar />
        </aside>
        <main className="min-w-0 flex-1">
          <AppMobileNav />
          {children}
        </main>
      </div>
    </div>
  );
}
