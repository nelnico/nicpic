"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ArrowLeft, ArrowRight, Info } from "lucide-react";
import type { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const photo = photos[index];

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const startX = useRef(0);
  const pointerId = useRef<number | null>(null);

  const go = useCallback(
    (dir: number) => {
      const next = (index + dir + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    },
    [onClose, go],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKey]);

  // Close the details panel when navigating between photos.
  useEffect(() => {
    setInfoOpen(false);
  }, [index]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const delta = e.clientX - startX.current;
    const threshold = Math.min(120, (trackRef.current?.clientWidth ?? 600) * 0.18);
    if (delta <= -threshold) go(1);
    else if (delta >= threshold) go(-1);
    setDragX(0);
    pointerId.current = null;
  };

  const translate = `calc(${-index * 100}% + ${dragX}px)`;

  // Optional gear / settings shown in the info dropdown.
  const settings = (
    [
      ["Camera", photo.camera],
      ["Lens", photo.lens],
      ["ISO", photo.iso],
      ["Aperture", photo.aperture],
      ["Shutter", photo.shutterSpeed],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value }));
  const hasSettings = settings.length > 0 || Boolean(photo.description);

  return (
    <div className="fade-in fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="eyebrow text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {photo.category}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="eyebrow hidden sm:inline">Close</span>
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center px-4 md:px-16">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={1.25} />
        </button>

        <div
          className="relative h-full w-full touch-pan-y overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <div
            ref={trackRef}
            className="flex h-full"
            style={{
              transform: `translate3d(${translate}, 0, 0)`,
              transition: dragging ? "none" : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {photos.map((p) => (
              <div
                key={p.id}
                className="flex h-full w-full shrink-0 items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.title}
                  width={p.width}
                  height={p.height}
                  draggable={false}
                  className="max-h-full max-w-full select-none object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="absolute right-2 z-10 hidden h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <ArrowRight className="h-6 w-6" strokeWidth={1.25} />
        </button>
      </div>

      {/* Metadata */}
      <div className="relative border-t border-border px-6 py-6 md:px-10 md:py-8">
        {hasSettings && (
          <div className="absolute right-6 top-6 md:right-10">
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              aria-label="Photo details"
              aria-expanded={infoOpen}
              className={`transition-colors hover:text-foreground ${
                infoOpen ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Info className="h-5 w-5" strokeWidth={1.5} />
            </button>
            {infoOpen && (
              <div className="absolute right-0 bottom-full mb-3 w-max rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md">
                {photo.description && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold">{photo.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{photo.description}</p>
                    {settings.length > 0 && <hr className="mt-3 border-border" />}
                  </div>
                )}
                {settings.length > 0 && (
                  <dl className="space-y-2.5">
                    {settings.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-baseline justify-between gap-8"
                      >
                        <dt className="eyebrow text-muted-foreground">{s.label}</dt>
                        <dd className="whitespace-nowrap text-sm">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="pr-10">
            <p className="eyebrow text-muted-foreground">
              {photo.category}
              {photo.location ? ` — ${photo.location}` : ""}
            </p>
            <h2 className="mt-2 font-serif text-4xl leading-none md:text-5xl">
              {photo.title}
            </h2>
          </div>

          <dl className="grid grid-cols-2 gap-x-12 gap-y-4 sm:flex sm:flex-wrap sm:items-end sm:gap-x-14">
            {photo.where && (
              <div>
                <dt className="eyebrow text-muted-foreground">Where</dt>
                <dd className="mt-1.5 text-sm">{photo.where}</dd>
              </div>
            )}
            {photo.date && (
              <div>
                <dt className="eyebrow text-muted-foreground">Date</dt>
                <dd className="mt-1.5 text-sm">{photo.date}</dd>
              </div>
            )}
            {photo.tags.length > 0 && (
              <div className="col-span-2 sm:col-auto">
                <dt className="eyebrow text-muted-foreground">Tags</dt>
                <dd className="mt-1.5 flex flex-wrap gap-2">
                  {photo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
