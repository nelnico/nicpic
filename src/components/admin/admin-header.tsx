"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Keep the login screen clean.
  if (pathname === "/admin/login") return null;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo → the live public site. */}
        <Link
          href="/"
          className="font-serif text-lg leading-none tracking-tight transition-opacity hover:opacity-70"
        >
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View site ↗
          </Link>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer border-none bg-transparent text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
