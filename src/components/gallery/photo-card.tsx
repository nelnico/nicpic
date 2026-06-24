"use client";

import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/types/photo";

const ROW_HEIGHT = 4;
const GAP = 4;

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onSelect: (photo: Photo) => void;
}

export function PhotoCard({ photo, index, onSelect }: PhotoCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [span, setSpan] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const img = el.querySelector("img");
    if (!img) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h && h > 0) setSpan(Math.ceil((h + GAP) / (ROW_HEIGHT + GAP)));
    });
    ro.observe(img);
    return () => ro.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(photo)}
      style={{
        animationDelay: `${Math.min(index * 55, 500)}ms`,
        gridRowEnd: span ? `span ${span}` : undefined,
      }}
      className="reveal-up group block w-full cursor-pointer overflow-hidden text-left"
    >
      <div className="relative overflow-hidden bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnail}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="block w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/0 to-background/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="eyebrow text-muted-foreground">
            {photo.category}
            {photo.location ? ` — ${photo.location}` : ""}
          </p>
          {photo.title && (
            <h3 className="mt-1 font-serif text-2xl leading-tight">{photo.title}</h3>
          )}
        </div>
      </div>
    </button>
  );
}
