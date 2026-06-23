"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import type { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function ExifRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function PhotoDetails({ photo }: { photo: Photo }) {
  const focalLength = [photo.focalLength, photo.focalLength35mm && photo.focalLength35mm !== photo.focalLength ? `${photo.focalLength35mm} equiv.` : ""]
    .filter(Boolean).join(" · ");

  const exifRows: [string, string][] = [
    ["Camera",    photo.cameraModel || photo.cameraMake],
    ["Aperture",  photo.aperture],
    ["Shutter",   photo.shutterSpeed],
    ["ISO",       photo.iso],
    ["Focal",     focalLength],
    ["Exposure",  photo.exposureMode],
    ["Metering",  photo.meteringMode],
    ["Flash",     photo.flash === "Fired" ? "Fired" : ""],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="overflow-y-auto bg-background px-6 pb-4 pt-6 md:px-10">
      {photo.description && (
        <p className="mb-5 text-sm leading-relaxed">{photo.description}</p>
      )}

      {exifRows.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
          {exifRows.map(([label, value]) => (
            <ExifRow key={label} label={label} value={value} />
          ))}
        </dl>
      )}

      {(photo.date || photo.tags.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {photo.date && <span>{photo.date}</span>}
          {photo.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const photo = photos[index];

  const trackRef   = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const hasMoved   = useRef(false);
  const pointerId  = useRef<number | null>(null);

  const [dragX,       setDragX]       = useState(0);
  const [dragging,    setDragging]    = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const go = useCallback(
    (dir: number) => {
      const next = (index + dir + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailsOpen) { setDetailsOpen(false); return; }
        onClose();
      }
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
    },
    [onClose, go, detailsOpen],
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

  useEffect(() => {
    setDetailsOpen(false);
  }, [index]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    startX.current    = e.clientX;
    hasMoved.current  = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (!hasMoved.current && Math.abs(dx) > 5) hasMoved.current = true;
    setDragX(dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    pointerId.current = null;

    if (!hasMoved.current) {
      setDragX(0);
      return;
    }

    const delta = e.clientX - startX.current;
    const threshold = Math.min(120, (trackRef.current?.clientWidth ?? 600) * 0.18);
    if (delta <= -threshold) go(1);
    else if (delta >= threshold) go(-1);
    setDragX(0);
  };

  const translate = `calc(${-index * 100}% + ${dragX}px)`;

  return (
    <div className="fade-in fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 md:px-10 [@media(max-height:500px)]:py-1.5">
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

      {/* Stage — fills all space between top bar and info strip */}
      <div className="relative flex min-h-0 flex-1 items-center md:px-16">
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

      {/* Bottom: strip in flex flow (always viewport-bottom) + details expanding upward over image */}
      <div className="relative shrink-0">
        {/* Details panel — absolute, grows upward over the image, never shifts the stage */}
        <div
          className="absolute inset-x-0 bottom-full overflow-hidden transition-[max-height] duration-[400ms] ease-in-out"
          style={{ maxHeight: detailsOpen ? "50vh" : "0px" }}
        >
          <PhotoDetails photo={photo} />
        </div>

        {/* Info strip */}
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex w-full items-end justify-between bg-background px-6 py-5 text-left md:px-10"
        >
          <div>
            <p className="eyebrow text-muted-foreground">
              {photo.category}
              {photo.location ? ` — ${photo.location}` : ""}
              {photo.where ? ` · ${photo.where}` : ""}
            </p>
            <h2 className="mt-1 font-serif text-2xl leading-tight">{photo.title}</h2>
          </div>
          <ChevronDown
            className={`mb-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
              detailsOpen ? "rotate-180" : ""
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}
