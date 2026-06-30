"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";

import { cn } from "@/shared/lib/cn";

type AppNavLinkProps = {
  href: Route;
  active?: boolean;
  className?: string;
  pendingClassName?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page";
};

export function AppNavLink({
  href,
  active = false,
  className,
  pendingClassName,
  children,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: AppNavLinkProps) {
  const pathname = usePathname() ?? "/quality";
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  const prefetch = () => {
    if (href !== pathname) {
      router.prefetch(href);
    }
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      href === pathname ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    setPending(true);
    router.push(href);
  };

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      aria-busy={pending ? "true" : undefined}
      data-pending={pending ? "true" : undefined}
      onClick={handleClick}
      onFocus={prefetch}
      onPointerEnter={prefetch}
      className={cn(className, pending && pendingClassName)}
    >
      {children}
      {pending ? <span className="ml-auto text-xs font-semibold text-[#0b8b8b]">打开中</span> : null}
    </Link>
  );
}