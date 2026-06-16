"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/data/photos";

interface FilterBarProps {
  categories: Category[];
  active: Category | "All";
  onChange: (value: Category | "All") => void;
}

export function FilterBar({ categories, active, onChange }: FilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories.length]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 120, behavior: "smooth" });
  };

  const options: (Category | "All")[] = ["All", ...categories];

  return (
    <div className="flex items-end justify-between border-b border-border pt-4 pb-6">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 overflow-x-auto no-scrollbar flex-1 min-w-0"
        >
          {options.map((option) => {
            const isActive = option === active;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                className={`eyebrow shrink-0 border-b-2 pb-1 transition-colors ${
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll(1)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
