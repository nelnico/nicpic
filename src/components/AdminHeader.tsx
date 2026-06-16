"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";

const links = [
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/categories", label: "Categories" },
];

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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/admin"
          className="font-serif text-lg leading-none tracking-tight transition-opacity hover:opacity-70"
        >
          {siteConfig.name}{" "}
          <span className="eyebrow text-muted-foreground">admin</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "text-foreground"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            View site ↗
          </Link>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer border-none bg-transparent text-muted-foreground transition-colors hover:text-foreground"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
