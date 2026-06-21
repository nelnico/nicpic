"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import type { Photo } from "@/types/photo";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const photo = photos[index];

  const trackRef   = useRef<HTMLDivElement>(null);
  const stageRef   = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const startY     = useRef(0);
  const panAtDown  = useRef({ x: 0, y: 0 });
  const hasMoved   = useRef(false);
  const pointerId  = useRef<number | null>(null);

  const [dragX,      setDragX]     = useState(0);
  const [dragging,   setDragging]  = useState(false);
  const [zoomed,     setZoomed]    = useState(false);
  const [zoomLevel,  setZoomLevel] = useState(1);
  const [panX,       setPanX]      = useState(0);
  const [panY,       setPanY]      = useState(0);

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
        if (zoomed) { setZoomed(false); setPanX(0); setPanY(0); }
        else onClose();
      }
      if (!zoomed && e.key === "ArrowLeft")  go(-1);
      if (!zoomed && e.key === "ArrowRight") go(1);
    },
    [onClose, go, zoomed],
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

  // Reset zoom and pan when navigating to a different photo.
  useEffect(() => {
    setZoomed(false);
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  }, [index]);

  // Compute zoom scale so the image fills the viewport (one dimension edge-to-edge).
  const computeFillZoom = (el: HTMLDivElement): number => {
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const photoAspect = photo.width / photo.height;
    const containerAspect = cw / ch;
    // Determine which dimension the image binds on at scale 1 (object-contain logic).
    const imgW = photoAspect >= containerAspect ? cw : ch * photoAspect;
    const imgH = photoAspect >= containerAspect ? cw / photoAspect : ch;
    return Math.max(cw / imgW, ch / imgH, 1.5); // always at least 1.5×
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current    = e.pointerId;
    startX.current       = e.clientX;
    startY.current       = e.clientY;
    panAtDown.current    = { x: panX, y: panY };
    hasMoved.current     = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasMoved.current = true;
    }
    if (zoomed) {
      const el = stageRef.current;
      if (!el) return;
      const maxX = el.clientWidth  * (zoomLevel - 1) / 2;
      const maxY = el.clientHeight * (zoomLevel - 1) / 2;
      setPanX(Math.min(maxX, Math.max(-maxX, panAtDown.current.x + dx)));
      setPanY(Math.min(maxY, Math.max(-maxY, panAtDown.current.y + dy)));
    } else {
      setDragX(dx);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    pointerId.current = null;

    if (!hasMoved.current) {
      if (!zoomed) {
        const el = stageRef.current;
        if (el) setZoomLevel(computeFillZoom(el));
        setPanX(0);
        setPanY(0);
        setZoomed(true);
      } else {
        setZoomed(false);
      }
      setDragX(0);
      return;
    }

    if (zoomed) return;

    const delta = e.clientX - startX.current;
    const threshold = Math.min(120, (trackRef.current?.clientWidth ?? 600) * 0.18);
    if (delta <= -threshold) go(1);
    else if (delta >= threshold) go(-1);
    setDragX(0);
  };

  const translate = `calc(${-index * 100}% + ${dragX}px)`;
  const cursor = zoomed
    ? (dragging ? "grabbing" : "move")
    : "zoom-in";

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

      {/* Stage */}
      <div
        className="relative flex min-h-0 flex-1 items-center md:px-16"
        style={{
          maxHeight: `calc(100vw * ${photo.height / photo.width})`,
          transition: "max-height 350ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {!zoomed && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={1.25} />
          </button>
        )}

        <div
          ref={stageRef}
          className={`relative h-full w-full overflow-hidden ${zoomed ? "touch-none" : "touch-pan-y"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ cursor }}
        >
          <div
            ref={trackRef}
            className="flex h-full"
            style={{
              transform: `translate3d(${translate}, 0, 0)`,
              transition: dragging ? "none" : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="flex h-full w-full shrink-0 items-center justify-center"
                style={
                  zoomed && i === index
                    ? {
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                        transition: dragging ? "none" : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }
                    : { transition: "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)" }
                }
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

        {!zoomed && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-2 z-10 hidden h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:flex"
          >
            <ArrowRight className="h-6 w-6" strokeWidth={1.25} />
          </button>
        )}
      </div>
    </div>
  );
}
