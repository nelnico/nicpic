"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import { useState } from "react";

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30  border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3 md:px-10">
        <a
          href="/"
          className="flex items-baseline gap-2 transition-opacity hover:opacity-70"
        >
          <span className="font-serif text-2xl leading-none tracking-tight">
            {siteConfig.name}
          </span>
          <span className="eyebrow hidden text-muted-foreground sm:inline">
            {siteConfig.eyebrow}
          </span>
        </a>

        <Dialog open={open} onOpenChange={setOpen}>
          <nav className="flex items-center gap-7 md:gap-10">
            {/* Base UI's DialogTrigger renders a <button>; apply Lovable's
                classes directly (Base UI has no `asChild`). */}
            <DialogTrigger className="eyebrow cursor-pointer border-none bg-transparent text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </DialogTrigger>
          </nav>
          <DialogContent className="flex min-h-50 items-center justify-center">
            <p className="text-4xl font-bold tracking-tight">TSEK!</p>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
