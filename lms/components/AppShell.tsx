"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/grades", label: "Grades" },
  { href: "/gaps", label: "Gaps" },
  { href: "/kinesis", label: "KINESIS" },
  { href: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle menu"
              className="rounded-md p-2 sm:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Roadmap LMS
            </Link>
          </div>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  pathname?.startsWith(item.href)
                    ? "bg-[color:var(--color-surface)] text-[color:var(--color-text)]"
                    : "text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]",
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="ml-2 rounded-md px-3 py-2 text-sm text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"
            >
              Sign out
            </button>
          </nav>
        </div>
        {open ? (
          <nav className="border-t border-[color:var(--color-border)] sm:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-3 text-sm",
                    pathname?.startsWith(item.href)
                      ? "bg-[color:var(--color-surface)]"
                      : "text-[color:var(--color-text-dim)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="rounded-md px-3 py-3 text-left text-sm text-[color:var(--color-text-dim)]"
              >
                Sign out
              </button>
            </div>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
