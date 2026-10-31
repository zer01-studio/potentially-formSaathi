"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Fingerprint, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/workspace", label: "Forms", icon: FileText, match: /^\/workspace(\/forms\/.*)?$/ },
  {
    href: "/workspace/templates",
    label: "Templates",
    icon: LayoutTemplate,
    match: /^\/workspace\/templates$/,
  },
  {
    href: "/workspace/context",
    label: "Context",
    icon: Fingerprint,
    match: /^\/workspace\/context$/,
  },
];

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">
        {LINKS.map(({ href, label, icon: Icon, match }) => {
          const active = match.test(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
