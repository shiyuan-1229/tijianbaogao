# Store AI Clinic Next.js Agent Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Streamlit frontend with a production-grade Next.js agent workspace that supports file-driven diagnosis, live task progress, rich result review, and configuration surfaces for brands, knowledge, and settings.

**Architecture:** Add a dedicated Next.js 15 frontend at `store-ai-clinic-web/` inside the current repository, organized by feature modules and backed by typed domain mappers, Zustand stores, Tailwind tokens, shadcn/ui primitives, and a thin Next BFF layer. Build `Agent` and `Tasks` against real FastAPI contracts first, then fill `Brands`, `Knowledge`, and `Settings` with stable typed adapters that can be switched to real APIs without restructuring the UI.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, React Dropzone, ECharts, Vercel AI SDK, Vitest, React Testing Library, Playwright

---

## Scope Check

The approved spec spans one frontend product with five coordinated surfaces:

1. shell and navigation
2. agent workflow
3. task review
4. configuration surfaces
5. migration and validation

This remains one implementation plan because all five surfaces share one app shell, one design system, one state model, and one migration boundary. The plan is staged so that `Agent` and `Tasks` become real first, while the rest of the shell stays structurally complete from day one.

## File Structure

Create the Next.js application under `store-ai-clinic-web/` and keep boundaries narrow.

### Root of the frontend app

- `store-ai-clinic-web/package.json`: app scripts and dependencies
- `store-ai-clinic-web/tsconfig.json`: TypeScript config
- `store-ai-clinic-web/next.config.ts`: Next runtime config
- `store-ai-clinic-web/postcss.config.js`: Tailwind processing
- `store-ai-clinic-web/components.json`: shadcn/ui config
- `store-ai-clinic-web/vitest.config.ts`: unit test config
- `store-ai-clinic-web/playwright.config.ts`: e2e config
- `store-ai-clinic-web/.env.example`: frontend environment contract
- `store-ai-clinic-web/README.md`: frontend runbook
- `store-ai-clinic-web/next-env.d.ts`: Next TypeScript runtime types

### App Router shell

- `store-ai-clinic-web/app/layout.tsx`: root HTML shell
- `store-ai-clinic-web/app/providers.tsx`: global providers
- `store-ai-clinic-web/app/globals.css`: Tailwind entry and global resets
- `store-ai-clinic-web/app/(workspace)/layout.tsx`: authenticated workspace shell
- `store-ai-clinic-web/app/(workspace)/agent/page.tsx`: agent entry page
- `store-ai-clinic-web/app/(workspace)/tasks/page.tsx`: tasks overview page
- `store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx`: task detail page
- `store-ai-clinic-web/app/(workspace)/brands/page.tsx`: brands page
- `store-ai-clinic-web/app/(workspace)/knowledge/page.tsx`: knowledge page
- `store-ai-clinic-web/app/(workspace)/settings/page.tsx`: settings page

### Next BFF routes

- `store-ai-clinic-web/app/api/agent/run/route.ts`
- `store-ai-clinic-web/app/api/agent/upload/route.ts`
- `store-ai-clinic-web/app/api/agent/confirm/route.ts`
- `store-ai-clinic-web/app/api/tasks/[taskId]/route.ts`
- `store-ai-clinic-web/app/api/tasks/[taskId]/events/route.ts`
- `store-ai-clinic-web/app/api/brands/route.ts`
- `store-ai-clinic-web/app/api/knowledge/route.ts`
- `store-ai-clinic-web/app/api/settings/route.ts`

### Shared frontend infrastructure

- `store-ai-clinic-web/shared/config/env.ts`: typed env reader
- `store-ai-clinic-web/shared/config/nav.ts`: primary nav config
- `store-ai-clinic-web/shared/api/client.ts`: browser fetch client
- `store-ai-clinic-web/shared/api/server-client.ts`: server route client
- `store-ai-clinic-web/shared/api/endpoints.ts`: API paths
- `store-ai-clinic-web/shared/api/errors.ts`: HTTP error helpers
- `store-ai-clinic-web/shared/api/sse.ts`: event stream helper
- `store-ai-clinic-web/shared/api/mock/*.ts`: typed mock adapters
- `store-ai-clinic-web/shared/store/workspace-store.ts`
- `store-ai-clinic-web/shared/store/agent-session-store.ts`
- `store-ai-clinic-web/shared/store/tasks-store.ts`
- `store-ai-clinic-web/shared/store/brands-store.ts`
- `store-ai-clinic-web/shared/store/knowledge-store.ts`
- `store-ai-clinic-web/shared/lib/cn.ts`
- `store-ai-clinic-web/shared/lib/dates.ts`
- `store-ai-clinic-web/shared/lib/formatters.ts`
- `store-ai-clinic-web/shared/lib/chart-theme.ts`
- `store-ai-clinic-web/shared/lib/upload.ts`
- `store-ai-clinic-web/shared/hooks/use-mobile.ts`
- `store-ai-clinic-web/shared/hooks/use-debounced-value.ts`
- `store-ai-clinic-web/shared/ui/*`: reusable shell, status, and loading primitives

### Domain entities

- `store-ai-clinic-web/entities/agent/types.ts`
- `store-ai-clinic-web/entities/agent/mappers.ts`
- `store-ai-clinic-web/entities/tasks/types.ts`
- `store-ai-clinic-web/entities/tasks/mappers.ts`
- `store-ai-clinic-web/entities/brands/types.ts`
- `store-ai-clinic-web/entities/brands/mappers.ts`
- `store-ai-clinic-web/entities/knowledge/types.ts`
- `store-ai-clinic-web/entities/knowledge/mappers.ts`
- `store-ai-clinic-web/entities/settings/types.ts`

### Feature modules

- `store-ai-clinic-web/features/agent/components/*`
- `store-ai-clinic-web/features/agent/hooks/*`
- `store-ai-clinic-web/features/agent/lib/*`
- `store-ai-clinic-web/features/tasks/components/*`
- `store-ai-clinic-web/features/tasks/hooks/*`
- `store-ai-clinic-web/features/brands/components/*`
- `store-ai-clinic-web/features/knowledge/components/*`
- `store-ai-clinic-web/features/settings/components/*`

### Design system

- `store-ai-clinic-web/components/ui/*`: shadcn/ui generated primitives
- `store-ai-clinic-web/styles/tokens.css`: semantic color and spacing tokens
- `store-ai-clinic-web/styles/theme.css`: app-layer theme rules

### Tests

- `store-ai-clinic-web/tests/unit/agent-page.test.tsx`
- `store-ai-clinic-web/tests/unit/tasks-page.test.tsx`
- `store-ai-clinic-web/tests/unit/brands-page.test.tsx`
- `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx`
- `store-ai-clinic-web/tests/unit/settings-page.test.tsx`
- `store-ai-clinic-web/tests/unit/agent-store.test.ts`
- `store-ai-clinic-web/tests/unit/task-mappers.test.ts`
- `store-ai-clinic-web/tests/e2e/agent-flow.spec.ts`
- `store-ai-clinic-web/tests/e2e/tasks-review.spec.ts`

## Milestone Map

1. `M1`: bootstrap the Next.js app and ship the full workspace shell
2. `M2`: deliver the real `Agent` flow and task creation path
3. `M3`: deliver real `Tasks` review and detail routes
4. `M4`: deliver `Brands`, `Knowledge`, `Settings`, and migration hardening

## Task 1: Bootstrap the Next.js Workspace and Tooling

**Files:**
- Create: `store-ai-clinic-web/package.json`
- Create: `store-ai-clinic-web/tsconfig.json`
- Create: `store-ai-clinic-web/next.config.ts`
- Create: `store-ai-clinic-web/postcss.config.js`
- Create: `store-ai-clinic-web/tailwind.config.ts`
- Create: `store-ai-clinic-web/components.json`
- Create: `store-ai-clinic-web/vitest.config.ts`
- Create: `store-ai-clinic-web/playwright.config.ts`
- Create: `store-ai-clinic-web/.env.example`
- Create: `store-ai-clinic-web/README.md`
- Create: `store-ai-clinic-web/next-env.d.ts`
- Test: `store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx`

- [ ] **Step 1: Write the failing shell smoke test**

```tsx
// store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import WorkspaceLayout from "@/app/(workspace)/layout";

describe("workspace shell", () => {
  it("renders the primary navigation labels", () => {
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Brands")).toBeInTheDocument();
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd store-ai-clinic-web && npm run test -- app-shell-smoke.test.tsx`

Expected: FAIL with `Cannot find module '@/app/(workspace)/layout'` or `Missing script: test`

- [ ] **Step 3: Create the frontend workspace and minimal toolchain**

```json
// store-ai-clinic-web/package.json
{
  "name": "store-ai-clinic-web",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@ai-sdk/react": "^1.0.0",
    "@radix-ui/react-collapsible": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "echarts": "^5.5.1",
    "framer-motion": "^11.11.9",
    "lucide-react": "^0.453.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-dropzone": "^14.2.10",
    "tailwind-merge": "^2.5.3",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.2",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.8.1",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

```ts
// store-ai-clinic-web/next-env.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is auto-managed by Next.js and should stay present in the workspace.
```

```js
// store-ai-clinic-web/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

```ts
// store-ai-clinic-web/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        app: "rgb(var(--app-bg) / <alpha-value>)",
        panel: "rgb(var(--panel-bg) / <alpha-value>)",
        surface: "rgb(var(--surface-bg) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--panel-bg) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)"
      }
    }
  },
  plugins: []
};

export default config;
```

```json
// store-ai-clinic-web/components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/shared/lib"
  }
}
```

```json
// store-ai-clinic-web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```ts
// store-ai-clinic-web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
```

```ts
// store-ai-clinic-web/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
```

```env
// store-ai-clinic-web/.env.example
NEXT_PUBLIC_APP_NAME=Store AI Clinic
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_ENABLE_MOCK_CONFIG=true
```

- [ ] **Step 4: Add the test setup file**

```ts
// store-ai-clinic-web/tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Install dependencies**

Run: `cd store-ai-clinic-web && npm install`

Expected: dependencies install successfully and a `package-lock.json` file is created

- [ ] **Step 6: Run the test to verify the toolchain is wired**

Run: `cd store-ai-clinic-web && npm run test -- app-shell-smoke.test.tsx`

Expected: FAIL with an import error for the missing workspace layout file, proving the test harness is active

- [ ] **Step 7: Commit**

```bash
git add store-ai-clinic-web/package.json store-ai-clinic-web/package-lock.json store-ai-clinic-web/tsconfig.json store-ai-clinic-web/next.config.ts store-ai-clinic-web/postcss.config.js store-ai-clinic-web/tailwind.config.ts store-ai-clinic-web/components.json store-ai-clinic-web/vitest.config.ts store-ai-clinic-web/playwright.config.ts store-ai-clinic-web/.env.example store-ai-clinic-web/README.md store-ai-clinic-web/next-env.d.ts store-ai-clinic-web/tests/setup.ts store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx
git commit -m "chore: bootstrap nextjs agent frontend workspace"
```

## Task 2: Build the Global Workspace Shell, Tokens, and Navigation

**Files:**
- Create: `store-ai-clinic-web/app/layout.tsx`
- Create: `store-ai-clinic-web/app/providers.tsx`
- Create: `store-ai-clinic-web/app/globals.css`
- Create: `store-ai-clinic-web/app/(workspace)/layout.tsx`
- Create: `store-ai-clinic-web/shared/config/nav.ts`
- Create: `store-ai-clinic-web/shared/lib/cn.ts`
- Create: `store-ai-clinic-web/shared/store/workspace-store.ts`
- Create: `store-ai-clinic-web/shared/ui/app-sidebar.tsx`
- Create: `store-ai-clinic-web/shared/ui/page-header.tsx`
- Create: `store-ai-clinic-web/styles/tokens.css`
- Create: `store-ai-clinic-web/styles/theme.css`
- Modify: `store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx`

- [ ] **Step 1: Expand the failing shell test to assert selected page and recent task slot**

```tsx
// store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import WorkspaceLayout from "@/app/(workspace)/layout";

describe("workspace shell", () => {
  it("renders the primary navigation labels and recent tasks heading", () => {
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Brands")).toBeInTheDocument();
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Recent tasks")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails because the layout does not exist yet**

Run: `cd store-ai-clinic-web && npm run test -- app-shell-smoke.test.tsx`

Expected: FAIL with `Cannot find module '@/app/(workspace)/layout'`

- [ ] **Step 3: Implement the workspace shell and shared navigation**

```ts
// store-ai-clinic-web/shared/config/nav.ts
export const primaryNav = [
  { href: "/agent", label: "Agent" },
  { href: "/tasks", label: "Tasks" },
  { href: "/brands", label: "Brands" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/settings", label: "Settings" }
] as const;
```

```ts
// store-ai-clinic-web/shared/store/workspace-store.ts
import { create } from "zustand";

type WorkspaceState = {
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  selectedBrandId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSelectedBrandId: (id: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  selectedBrandId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSelectedBrandId: (id) => set({ selectedBrandId: id })
}));
```

```tsx
// store-ai-clinic-web/shared/ui/app-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNav } from "@/shared/config/nav";

const recentTasks = [
  { id: "task-daily-001", label: "Daily diagnosis · Hangzhou West" },
  { id: "task-weekly-003", label: "Weekly diagnosis · Nanjing East" }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-panel px-4 py-5">
      <div className="mb-6">
        <p className="text-sm font-medium text-foreground">Store AI Clinic</p>
        <p className="text-sm text-muted-foreground">AI analyst workspace</p>
      </div>
      <nav aria-label="Primary" className="space-y-1">
        {primaryNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2 text-sm transition ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent tasks
        </p>
        <div className="space-y-1">
          {recentTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {task.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

```tsx
// store-ai-clinic-web/app/(workspace)/layout.tsx
import type { ReactNode } from "react";

import { AppSidebar } from "@/shared/ui/app-sidebar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app text-foreground">
      <AppSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```

```css
/* store-ai-clinic-web/styles/tokens.css */
:root {
  --app-bg: 248 250 252;
  --panel-bg: 242 245 247;
  --surface-bg: 255 255 255;
  --foreground: 18 24 27;
  --muted-foreground: 88 101 108;
  --border: 222 228 232;
  --accent: 19 111 103;
  --accent-foreground: 248 252 251;
}
```

```css
/* store-ai-clinic-web/styles/theme.css */
body {
  background: rgb(var(--app-bg));
  color: rgb(var(--foreground));
}
```

- [ ] **Step 4: Run the shell smoke test to verify it passes**

Run: `cd store-ai-clinic-web && npm run test -- app-shell-smoke.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/layout.tsx store-ai-clinic-web/app/providers.tsx store-ai-clinic-web/app/globals.css store-ai-clinic-web/app/(workspace)/layout.tsx store-ai-clinic-web/shared/config/nav.ts store-ai-clinic-web/shared/lib/cn.ts store-ai-clinic-web/shared/store/workspace-store.ts store-ai-clinic-web/shared/ui/app-sidebar.tsx store-ai-clinic-web/shared/ui/page-header.tsx store-ai-clinic-web/styles/tokens.css store-ai-clinic-web/styles/theme.css store-ai-clinic-web/tests/unit/app-shell-smoke.test.tsx
git commit -m "feat: add nextjs workspace shell and navigation"
```

## Task 3: Define Domain Types, Mappers, Shared API Clients, and Stores

**Files:**
- Create: `store-ai-clinic-web/shared/config/env.ts`
- Create: `store-ai-clinic-web/shared/api/endpoints.ts`
- Create: `store-ai-clinic-web/shared/api/client.ts`
- Create: `store-ai-clinic-web/shared/api/server-client.ts`
- Create: `store-ai-clinic-web/shared/api/errors.ts`
- Create: `store-ai-clinic-web/entities/agent/types.ts`
- Create: `store-ai-clinic-web/entities/agent/mappers.ts`
- Create: `store-ai-clinic-web/entities/tasks/types.ts`
- Create: `store-ai-clinic-web/entities/tasks/mappers.ts`
- Create: `store-ai-clinic-web/shared/store/agent-session-store.ts`
- Create: `store-ai-clinic-web/shared/store/tasks-store.ts`
- Test: `store-ai-clinic-web/tests/unit/task-mappers.test.ts`
- Test: `store-ai-clinic-web/tests/unit/agent-store.test.ts`

- [ ] **Step 1: Write the failing mapper and store tests**

```ts
// store-ai-clinic-web/tests/unit/task-mappers.test.ts
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
        next_action: "Check staffing and queue handoff after 13:00."
      }
    });

    expect(result.id).toBe("task-001");
    expect(result.summary.title).toBe("Traffic weakened after lunch");
    expect(result.status.source).toBe("llm");
  });
});
```

```ts
// store-ai-clinic-web/tests/unit/agent-store.test.ts
import { describe, expect, it } from "vitest";

import { useAgentSessionStore } from "@/shared/store/agent-session-store";

describe("agent session store", () => {
  it("appends timeline events in order", () => {
    const { addTimelineEvent, resetSession } = useAgentSessionStore.getState();
    resetSession();
    addTimelineEvent({ id: "evt-1", label: "Upload received", state: "done" });
    addTimelineEvent({ id: "evt-2", label: "Diagnosis started", state: "running" });

    const events = useAgentSessionStore.getState().timeline;
    expect(events.map((item) => item.id)).toEqual(["evt-1", "evt-2"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd store-ai-clinic-web && npm run test -- task-mappers.test.ts agent-store.test.ts`

Expected: FAIL with missing module errors for mappers and stores

- [ ] **Step 3: Implement the DTOs, view models, and state stores**

```ts
// store-ai-clinic-web/entities/agent/types.ts
export type DiagnosisRunDto = {
  task_id: string;
  store_id: string;
  diagnosis_type: "daily" | "weekly";
  graph_stage: string;
  diagnosis_source: string | null;
  diagnosis_error: string | null;
  diagnosis_draft: {
    title: string;
    summary: string;
    next_action: string;
  };
};

export type AgentTimelineEvent = {
  id: string;
  label: string;
  state: "pending" | "running" | "done" | "error";
  detail?: string;
};
```

```ts
// store-ai-clinic-web/entities/tasks/types.ts
export type TaskResultViewModel = {
  id: string;
  storeId: string;
  diagnosisType: "daily" | "weekly";
  stage: string;
  status: {
    source: string | null;
    error: string | null;
  };
  summary: {
    title: string;
    text: string;
    nextAction: string;
  };
};
```

```ts
// store-ai-clinic-web/entities/tasks/mappers.ts
import type { DiagnosisRunDto } from "@/entities/agent/types";
import type { TaskResultViewModel } from "@/entities/tasks/types";

export function mapDiagnosisRunResponseToTaskResult(
  dto: DiagnosisRunDto,
): TaskResultViewModel {
  return {
    id: dto.task_id,
    storeId: dto.store_id,
    diagnosisType: dto.diagnosis_type,
    stage: dto.graph_stage,
    status: {
      source: dto.diagnosis_source,
      error: dto.diagnosis_error
    },
    summary: {
      title: dto.diagnosis_draft.title,
      text: dto.diagnosis_draft.summary,
      nextAction: dto.diagnosis_draft.next_action
    }
  };
}
```

```ts
// store-ai-clinic-web/shared/store/agent-session-store.ts
import { create } from "zustand";

import type { AgentTimelineEvent } from "@/entities/agent/types";

type AgentSessionState = {
  draft: string;
  timeline: AgentTimelineEvent[];
  setDraft: (draft: string) => void;
  addTimelineEvent: (event: AgentTimelineEvent) => void;
  resetSession: () => void;
};

export const useAgentSessionStore = create<AgentSessionState>((set) => ({
  draft: "",
  timeline: [],
  setDraft: (draft) => set({ draft }),
  addTimelineEvent: (event) =>
    set((state) => ({ timeline: [...state.timeline, event] })),
  resetSession: () => set({ draft: "", timeline: [] })
}));
```

```ts
// store-ai-clinic-web/shared/api/endpoints.ts
export const endpoints = {
  diagnosisRun: "/api/diagnosis/run",
  onboardingPreview: "/api/onboarding/template-preview",
  batchPreview: "/api/batches/preview"
} as const;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd store-ai-clinic-web && npm run test -- task-mappers.test.ts agent-store.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/shared/config/env.ts store-ai-clinic-web/shared/api/endpoints.ts store-ai-clinic-web/shared/api/client.ts store-ai-clinic-web/shared/api/server-client.ts store-ai-clinic-web/shared/api/errors.ts store-ai-clinic-web/entities/agent/types.ts store-ai-clinic-web/entities/agent/mappers.ts store-ai-clinic-web/entities/tasks/types.ts store-ai-clinic-web/entities/tasks/mappers.ts store-ai-clinic-web/shared/store/agent-session-store.ts store-ai-clinic-web/shared/store/tasks-store.ts store-ai-clinic-web/tests/unit/task-mappers.test.ts store-ai-clinic-web/tests/unit/agent-store.test.ts
git commit -m "feat: add typed frontend domain models and stores"
```

## Task 4: Deliver the Agent Page, File Upload UX, and Real Diagnosis Trigger

**Files:**
- Create: `store-ai-clinic-web/app/(workspace)/agent/page.tsx`
- Create: `store-ai-clinic-web/features/agent/components/agent-shell.tsx`
- Create: `store-ai-clinic-web/features/agent/components/message-list.tsx`
- Create: `store-ai-clinic-web/features/agent/components/composer.tsx`
- Create: `store-ai-clinic-web/features/agent/components/upload-dropzone.tsx`
- Create: `store-ai-clinic-web/features/agent/components/execution-timeline.tsx`
- Create: `store-ai-clinic-web/features/agent/components/result-summary.tsx`
- Create: `store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts`
- Create: `store-ai-clinic-web/app/api/agent/run/route.ts`
- Test: `store-ai-clinic-web/tests/unit/agent-page.test.tsx`

- [ ] **Step 1: Write the failing Agent page test**

```tsx
// store-ai-clinic-web/tests/unit/agent-page.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AgentPage from "@/app/(workspace)/agent/page";

describe("agent page", () => {
  it("shows the main agent prompt and composer actions", () => {
    render(<AgentPage />);

    expect(screen.getByText("Work with your AI analyst")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask a question, upload reports, or start a diagnosis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run diagnosis" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd store-ai-clinic-web && npm run test -- agent-page.test.tsx`

Expected: FAIL with `Cannot find module '@/app/(workspace)/agent/page'`

- [ ] **Step 3: Implement the page, components, and diagnosis route bridge**

```tsx
// store-ai-clinic-web/app/(workspace)/agent/page.tsx
import { AgentShell } from "@/features/agent/components/agent-shell";

export default function AgentPage() {
  return <AgentShell />;
}
```

```tsx
// store-ai-clinic-web/features/agent/components/agent-shell.tsx
"use client";

import { Composer } from "@/features/agent/components/composer";
import { ExecutionTimeline } from "@/features/agent/components/execution-timeline";
import { ResultSummary } from "@/features/agent/components/result-summary";

export function AgentShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 px-6 py-8">
      <section className="min-w-0 flex-1">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Work with your AI analyst</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload store reports, ask for analysis, or trigger a diagnosis workflow.
          </p>
        </header>
        <ExecutionTimeline />
        <div className="sticky bottom-0 mt-6 bg-app/90 pb-2 pt-4 backdrop-blur">
          <Composer />
        </div>
      </section>
      <aside className="hidden w-[360px] shrink-0 xl:block">
        <ResultSummary />
      </aside>
    </div>
  );
}
```

```tsx
// store-ai-clinic-web/features/agent/components/composer.tsx
"use client";

import { useState } from "react";

export function Composer() {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask a question, upload reports, or start a diagnosis"
        className="min-h-28 w-full resize-none bg-transparent text-sm outline-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <button className="rounded-full border border-border px-4 py-2 text-sm">
          Upload files
        </button>
        <button className="rounded-full bg-[rgb(var(--accent))] px-4 py-2 text-sm text-white">
          Run diagnosis
        </button>
      </div>
    </div>
  );
}
```

```ts
// store-ai-clinic-web/app/api/agent/run/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const response = await fetch(`${API_BASE_URL}/api/diagnosis/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const json = await response.json();
  return NextResponse.json(json, { status: response.status });
}
```

- [ ] **Step 4: Run the Agent page test to verify it passes**

Run: `cd store-ai-clinic-web && npm run test -- agent-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/(workspace)/agent/page.tsx store-ai-clinic-web/features/agent/components/agent-shell.tsx store-ai-clinic-web/features/agent/components/message-list.tsx store-ai-clinic-web/features/agent/components/composer.tsx store-ai-clinic-web/features/agent/components/upload-dropzone.tsx store-ai-clinic-web/features/agent/components/execution-timeline.tsx store-ai-clinic-web/features/agent/components/result-summary.tsx store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts store-ai-clinic-web/app/api/agent/run/route.ts store-ai-clinic-web/tests/unit/agent-page.test.tsx
git commit -m "feat: add agent workspace and diagnosis trigger"
```

## Task 5: Deliver the Tasks Overview and Dedicated Task Detail Route

**Files:**
- Create: `store-ai-clinic-web/app/(workspace)/tasks/page.tsx`
- Create: `store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/tasks-shell.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/task-list.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/task-filters.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx`
- Create: `store-ai-clinic-web/features/tasks/components/anomalies-chart.tsx`
- Create: `store-ai-clinic-web/app/api/tasks/[taskId]/route.ts`
- Test: `store-ai-clinic-web/tests/unit/tasks-page.test.tsx`

- [ ] **Step 1: Write the failing Tasks page test**

```tsx
// store-ai-clinic-web/tests/unit/tasks-page.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TasksPage from "@/app/(workspace)/tasks/page";

describe("tasks page", () => {
  it("renders the execution-centric review layout", () => {
    render(<TasksPage />);

    expect(screen.getByText("Diagnosis tasks")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search tasks")).toBeInTheDocument();
    expect(screen.getByText("Execution log")).toBeInTheDocument();
    expect(screen.getByText("Diagnosis result")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd store-ai-clinic-web && npm run test -- tasks-page.test.tsx`

Expected: FAIL with `Cannot find module '@/app/(workspace)/tasks/page'`

- [ ] **Step 3: Implement the Tasks overview and detail route**

```tsx
// store-ai-clinic-web/app/(workspace)/tasks/page.tsx
import { TasksShell } from "@/features/tasks/components/tasks-shell";

export default function TasksPage() {
  return <TasksShell />;
}
```

```tsx
// store-ai-clinic-web/features/tasks/components/tasks-shell.tsx
"use client";

export function TasksShell() {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-6 px-6 py-8 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Diagnosis tasks</h1>
        <input
          placeholder="Search tasks"
          className="mt-4 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none"
        />
        <div className="mt-6">
          <p className="text-sm font-medium">Execution log</p>
          <div className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Task timeline and workflow logs render here.
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm font-medium">Diagnosis result</p>
        <div className="mt-3 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Afternoon traffic softened after lunch</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The diagnosis panel shows anomalies, root causes, and suggested actions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
```

```tsx
// store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx
type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params;
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Task {taskId}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dedicated task detail route for execution history and diagnosis output.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the Tasks page test to verify it passes**

Run: `cd store-ai-clinic-web && npm run test -- tasks-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/(workspace)/tasks/page.tsx store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx store-ai-clinic-web/features/tasks/components/tasks-shell.tsx store-ai-clinic-web/features/tasks/components/task-list.tsx store-ai-clinic-web/features/tasks/components/task-filters.tsx store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx store-ai-clinic-web/features/tasks/components/anomalies-chart.tsx store-ai-clinic-web/app/api/tasks/[taskId]/route.ts store-ai-clinic-web/tests/unit/tasks-page.test.tsx
git commit -m "feat: add tasks overview and detail route"
```

## Task 6: Build the Brands Surface with Tab-Based Editing

**Files:**
- Create: `store-ai-clinic-web/app/(workspace)/brands/page.tsx`
- Create: `store-ai-clinic-web/features/brands/components/brands-shell.tsx`
- Create: `store-ai-clinic-web/features/brands/components/brand-profile-form.tsx`
- Create: `store-ai-clinic-web/features/brands/components/templates-tab.tsx`
- Create: `store-ai-clinic-web/features/brands/components/field-mapping-tab.tsx`
- Create: `store-ai-clinic-web/features/brands/components/rules-tab.tsx`
- Create: `store-ai-clinic-web/shared/store/brands-store.ts`
- Create: `store-ai-clinic-web/tests/unit/brands-page.test.tsx`

- [ ] **Step 1: Write the failing Brands page test**

```tsx
// store-ai-clinic-web/tests/unit/brands-page.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import BrandsPage from "@/app/(workspace)/brands/page";

describe("brands page", () => {
  it("renders the four tab structure", () => {
    render(<BrandsPage />);

    expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Templates" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Field Mapping" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Diagnosis Rules" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd store-ai-clinic-web && npm run test -- brands-page.test.tsx`

Expected: FAIL with missing page or component modules

- [ ] **Step 3: Implement the tabbed Brands page**

```tsx
// store-ai-clinic-web/app/(workspace)/brands/page.tsx
import { BrandsShell } from "@/features/brands/components/brands-shell";

export default function BrandsPage() {
  return <BrandsShell />;
}
```

```tsx
// store-ai-clinic-web/features/brands/components/brands-shell.tsx
"use client";

export function BrandsShell() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
      <div className="mt-6 flex gap-2">
        <button role="tab" className="rounded-full bg-muted px-4 py-2 text-sm">Profile</button>
        <button role="tab" className="rounded-full bg-muted px-4 py-2 text-sm">Templates</button>
        <button role="tab" className="rounded-full bg-muted px-4 py-2 text-sm">Field Mapping</button>
        <button role="tab" className="rounded-full bg-muted px-4 py-2 text-sm">Diagnosis Rules</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the Brands page test to verify it passes**

Run: `cd store-ai-clinic-web && npm run test -- brands-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/(workspace)/brands/page.tsx store-ai-clinic-web/features/brands/components/brands-shell.tsx store-ai-clinic-web/features/brands/components/brand-profile-form.tsx store-ai-clinic-web/features/brands/components/templates-tab.tsx store-ai-clinic-web/features/brands/components/field-mapping-tab.tsx store-ai-clinic-web/features/brands/components/rules-tab.tsx store-ai-clinic-web/shared/store/brands-store.ts store-ai-clinic-web/tests/unit/brands-page.test.tsx
git commit -m "feat: add brands configuration surface"
```

## Task 7: Build the Knowledge and Settings Surfaces

**Files:**
- Create: `store-ai-clinic-web/app/(workspace)/knowledge/page.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/source-upload-panel.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/source-list.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/rag-status-panel.tsx`
- Create: `store-ai-clinic-web/app/(workspace)/settings/page.tsx`
- Create: `store-ai-clinic-web/features/settings/components/settings-shell.tsx`
- Create: `store-ai-clinic-web/features/settings/components/model-settings-form.tsx`
- Create: `store-ai-clinic-web/features/settings/components/upload-settings-form.tsx`
- Create: `store-ai-clinic-web/features/settings/components/notification-settings-form.tsx`
- Create: `store-ai-clinic-web/shared/store/knowledge-store.ts`
- Test: `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx`
- Test: `store-ai-clinic-web/tests/unit/settings-page.test.tsx`

- [ ] **Step 1: Write the failing Knowledge and Settings tests**

```tsx
// store-ai-clinic-web/tests/unit/knowledge-page.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import KnowledgePage from "@/app/(workspace)/knowledge/page";

describe("knowledge page", () => {
  it("renders the upload and RAG readiness structure", () => {
    render(<KnowledgePage />);
    expect(screen.getByText("Knowledge sources")).toBeInTheDocument();
    expect(screen.getByText("RAG readiness")).toBeInTheDocument();
  });
});
```

```tsx
// store-ai-clinic-web/tests/unit/settings-page.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import SettingsPage from "@/app/(workspace)/settings/page";

describe("settings page", () => {
  it("renders grouped system sections", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Model & AI")).toBeInTheDocument();
    expect(screen.getByText("Uploads")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd store-ai-clinic-web && npm run test -- knowledge-page.test.tsx settings-page.test.tsx`

Expected: FAIL with missing page modules

- [ ] **Step 3: Implement the Knowledge and Settings pages**

```tsx
// store-ai-clinic-web/app/(workspace)/knowledge/page.tsx
import { KnowledgeShell } from "@/features/knowledge/components/knowledge-shell";

export default function KnowledgePage() {
  return <KnowledgeShell />;
}
```

```tsx
// store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx
export function KnowledgeShell() {
  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge sources</h1>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm font-medium">RAG readiness</p>
      </section>
    </div>
  );
}
```

```tsx
// store-ai-clinic-web/app/(workspace)/settings/page.tsx
import { SettingsShell } from "@/features/settings/components/settings-shell";

export default function SettingsPage() {
  return <SettingsShell />;
}
```

```tsx
// store-ai-clinic-web/features/settings/components/settings-shell.tsx
export function SettingsShell() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-medium">Model & AI</h2>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-medium">Uploads</h2>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-medium">Notifications</h2>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run the page tests to verify they pass**

Run: `cd store-ai-clinic-web && npm run test -- knowledge-page.test.tsx settings-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/(workspace)/knowledge/page.tsx store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx store-ai-clinic-web/features/knowledge/components/source-upload-panel.tsx store-ai-clinic-web/features/knowledge/components/source-list.tsx store-ai-clinic-web/features/knowledge/components/rag-status-panel.tsx store-ai-clinic-web/app/(workspace)/settings/page.tsx store-ai-clinic-web/features/settings/components/settings-shell.tsx store-ai-clinic-web/features/settings/components/model-settings-form.tsx store-ai-clinic-web/features/settings/components/upload-settings-form.tsx store-ai-clinic-web/features/settings/components/notification-settings-form.tsx store-ai-clinic-web/shared/store/knowledge-store.ts store-ai-clinic-web/tests/unit/knowledge-page.test.tsx store-ai-clinic-web/tests/unit/settings-page.test.tsx
git commit -m "feat: add knowledge and settings surfaces"
```

## Task 8: Add BFF Hardening, e2e Validation, and Migration Documentation

**Files:**
- Create: `store-ai-clinic-web/app/api/agent/upload/route.ts`
- Create: `store-ai-clinic-web/app/api/agent/confirm/route.ts`
- Create: `store-ai-clinic-web/app/api/tasks/[taskId]/events/route.ts`
- Create: `store-ai-clinic-web/tests/e2e/agent-flow.spec.ts`
- Create: `store-ai-clinic-web/tests/e2e/tasks-review.spec.ts`
- Modify: `store-ai-clinic-web/README.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing e2e smoke spec for the Agent workflow**

```ts
// store-ai-clinic-web/tests/e2e/agent-flow.spec.ts
import { expect, test } from "@playwright/test";

test("agent page shows the main diagnosis workflow entry", async ({ page }) => {
  await page.goto("/agent");

  await expect(page.getByText("Work with your AI analyst")).toBeVisible();
  await expect(
    page.getByPlaceholder("Ask a question, upload reports, or start a diagnosis"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Run diagnosis" })).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test to verify it fails before the app is fully wired**

Run: `cd store-ai-clinic-web && npm run test:e2e -- agent-flow.spec.ts`

Expected: FAIL because the local app server is not yet configured for Playwright

- [ ] **Step 3: Add the remaining route handlers, Playwright config, and migration docs**

```ts
// store-ai-clinic-web/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000"
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true
  }
});
```

```md
<!-- store-ai-clinic-web/README.md -->
# Store AI Clinic Web

## Local development

1. `npm install`
2. `npm run dev`
3. Open `http://127.0.0.1:3000/agent`

## Tests

- `npm run test`
- `npm run test:e2e`

## API integration

- `Agent` and `Tasks` forward to the existing FastAPI backend
- `Brands`, `Knowledge`, and `Settings` may use typed adapters until backend routes are ready
```

```md
<!-- README.md -->
## Next.js frontend migration

The repository now contains a new frontend workspace at `store-ai-clinic-web/`.

- Use the Python app for backend APIs
- Use the Next.js app for the new operator experience
- Treat Streamlit as a temporary fallback during migration validation
```

- [ ] **Step 4: Run the full validation suite**

Run: `cd store-ai-clinic-web && npm run test`

Expected: PASS for unit tests

Run: `cd store-ai-clinic-web && npm run test:e2e`

Expected: PASS for Agent and Tasks smoke flows

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/app/api/agent/upload/route.ts store-ai-clinic-web/app/api/agent/confirm/route.ts store-ai-clinic-web/app/api/tasks/[taskId]/events/route.ts store-ai-clinic-web/tests/e2e/agent-flow.spec.ts store-ai-clinic-web/tests/e2e/tasks-review.spec.ts store-ai-clinic-web/playwright.config.ts store-ai-clinic-web/README.md README.md
git commit -m "docs: finalize nextjs migration plan and validation flow"
```

## Spec Coverage Check

The implementation tasks map back to the spec as follows:

- global IA and route shell: Tasks 1 and 2
- domain types, stores, and typed adapters: Task 3
- `Agent` page and real diagnosis trigger: Task 4
- `Tasks` overview and dedicated detail route: Task 5
- `Brands` tabs: Task 6
- `Knowledge` and `Settings`: Task 7
- BFF hardening, testing, and migration docs: Task 8

No approved spec section is left without a corresponding task.

## Placeholder Scan

The plan intentionally fixes these implementation choices to avoid ambiguity:

- frontend app path is `store-ai-clinic-web/`
- `Agent` and `Tasks` are the first real API-backed pages
- `Brands`, `Knowledge`, and `Settings` are allowed to start with typed adapters
- testing stack is Vitest plus Playwright

## Type Consistency Check

The primary diagnosis contract stays consistent across the plan:

- FastAPI source shape uses `task_id`, `store_id`, `diagnosis_type`, `graph_stage`, `diagnosis_source`, `diagnosis_error`, and `diagnosis_draft`
- frontend mapper converts that shape into `TaskResultViewModel`
- agent timeline state stays in `useAgentSessionStore`
- task review state stays in `useTasksStore`

No conflicting route names, store names, or DTO names are introduced later in the plan.
