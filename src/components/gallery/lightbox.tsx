"use client";

import type { Photo } from "@/types/photo";
import { ArrowLeft, ArrowRight, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PhotoDetails({ photo }: { photo: Photo }) {
  const camera = photo.cameraModel || photo.cameraMake;
  const focalLength = [
    photo.focalLength,
    photo.focalLength35mm && photo.focalLength35mm !== photo.focalLength
      ? `${photo.focalLength35mm} equiv.`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const grid: [string, string][] = [
    ["Aperture", photo.aperture],
    ["Shutter", photo.shutterSpeed],
    ["ISO", photo.iso],
    ["Focal", focalLength],
    ["Exposure", photo.exposureMode],
    ["Flash", photo.flash === "Fired" ? "Fired" : ""],
    ["Date", photo.date],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="overflow-y-auto bg-background/90 px-6 pb-4 pt-6 backdrop-blur-md md:px-10">
      {photo.description && (
        <p className="mb-5 text-sm leading-relaxed">{photo.description}</p>
      )}

      {camera && <p className="mb-3 text-sm">{camera}</p>}

      {grid.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {grid.map(([label, value]) => (
            <Cell key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {photo.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {photo.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const photo = photos[index];

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);
  const startX      = useRef(0);
  const hasMoved    = useRef(false);
  const hasPanned   = useRef(false);
  const lastTap     = useRef(0);
  const pinchStartDist = useRef(0);
  const isPinching     = useRef(false);
  const zoomStart  = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panning, setPanning] = useState(false);
  const [pinchScale, setPinchScale] = useState(1);

  const go = useCallback(
    (dir: number) => {
      const next = (index + dir + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  const openZoom = useCallback(() => {
    setZoomed(true);
    setPanX(0);
    setPanY(0);
  }, []);
  const closeZoom = useCallback(() => {
    setZoomed(false);
    setPanX(0);
    setPanY(0);
  }, []);
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) {
          closeZoom();
          return;
        }
        if (detailsOpen) {
          setDetailsOpen(false);
          return;
        }
        onClose();
      }
      if (!zoomed) {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }
    },
    [onClose, go, detailsOpen, zoomed, closeZoom],
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

  // Pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function touchDist(touches: TouchList) {
      return Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY,
      );
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        isPinching.current = true;
        pinchStartDist.current = touchDist(e.touches);
        setDragging(false);
        setDragX(0);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPinching.current || e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = touchDist(e.touches) / pinchStartDist.current;
      setPinchScale(Math.max(0.3, Math.min(4, ratio)));

      if (!zoomed && ratio > 1.3) {
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = (stageRef.current ?? el)!.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        const imgAspect = photo.width / photo.height;
        const renderedW = imgAspect > cw / ch ? cw : ch * imgAspect;
        const renderedH = imgAspect > cw / ch ? cw / imgAspect : ch;
        const normX = (mx - rect.left - (cw - renderedW) / 2) / renderedW;
        const normY = (my - rect.top  - (ch - renderedH) / 2) / renderedH;
        const maxX = Math.max(0, (photo.width  - cw) / 2);
        const maxY = Math.max(0, (photo.height - ch) / 2);
        setZoomed(true);
        setPanX(Math.max(-maxX, Math.min(maxX, photo.width  * (0.5 - normX))));
        setPanY(Math.max(-maxY, Math.min(maxY, photo.height * (0.5 - normY))));
        setPinchScale(1);
        isPinching.current = false;
      } else if (zoomed && ratio < 0.75) {
        closeZoom();
        setPinchScale(1);
        isPinching.current = false;
      }
    }

    function onTouchEnd() {
      isPinching.current = false;
      setPinchScale(1);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [zoomed, photo, closeZoom]);

  // Reset zoom and details when photo changes
  useEffect(() => {
    setDetailsOpen(false);
    closeZoom();
  }, [index, closeZoom]);

  // ── Swipe handlers (normal mode) ────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (isPinching.current) return;
    startX.current = e.clientX;
    hasMoved.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || isPinching.current) return;
    const dx = e.clientX - startX.current;
    if (!hasMoved.current && Math.abs(dx) > 5) hasMoved.current = true;
    setDragX(dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);

    if (!hasMoved.current) {
      setDragX(0);
      return;
    }

    const delta = e.clientX - startX.current;
    const threshold = Math.min(
      120,
      (trackRef.current?.clientWidth ?? 600) * 0.18,
    );
    if (delta <= -threshold) go(1);
    else if (delta >= threshold) go(-1);
    setDragX(0);
  };

  // ── Pan handlers (zoom mode) ─────────────────────────────────────────────

  const zoomPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    hasPanned.current = false;
    zoomStart.current = { x: e.clientX, y: e.clientY, panX, panY };
    setPanning(true);
  };

  const zoomPointerMove = (e: React.PointerEvent) => {
    if (!zoomStart.current) return;
    const newX = zoomStart.current.panX + (e.clientX - zoomStart.current.x);
    const newY = zoomStart.current.panY + (e.clientY - zoomStart.current.y);
    if (Math.abs(newX - (zoomStart.current?.panX ?? 0)) > 5 ||
        Math.abs(newY - (zoomStart.current?.panY ?? 0)) > 5) {
      hasPanned.current = true;
    }
    if (overlayRef.current) {
      const { clientWidth: cw, clientHeight: ch } = overlayRef.current;
      const maxX = Math.max(0, (photo.width  - cw) / 2);
      const maxY = Math.max(0, (photo.height - ch) / 2);
      setPanX(Math.max(-maxX, Math.min(maxX, newX)));
      setPanY(Math.max(-maxY, Math.min(maxY, newY)));
    } else {
      setPanX(newX);
      setPanY(newY);
    }
  };

  const zoomPointerUp = () => {
    zoomStart.current = null;
    setPanning(false);
  };

  // Manual double-tap: two clicks within 300 ms, with no drag in between.
  const handleTrackClick = (e: React.MouseEvent) => {
    if (hasMoved.current) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Centre the zoom on the tapped pixel.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Rendered image size under object-contain rules
      const imgAspect = photo.width / photo.height;
      const renderedW = imgAspect > cw / ch ? cw : ch * imgAspect;
      const renderedH = imgAspect > cw / ch ? cw / imgAspect : ch;

      // Normalised click position within the rendered image (0–1)
      const normX = (clickX - (cw - renderedW) / 2) / renderedW;
      const normY = (clickY - (ch - renderedH) / 2) / renderedH;

      // Pan that centres the clicked natural pixel, then clamp to bounds
      const maxX = Math.max(0, (photo.width  - cw) / 2);
      const maxY = Math.max(0, (photo.height - ch) / 2);
      setZoomed(true);
      setPanX(Math.max(-maxX, Math.min(maxX, photo.width  * (0.5 - normX))));
      setPanY(Math.max(-maxY, Math.min(maxY, photo.height * (0.5 - normY))));
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const handleOverlayClick = () => {
    if (hasPanned.current) return;
    const now = Date.now();
    if (now - lastTap.current < 300) { closeZoom(); lastTap.current = 0; }
    else lastTap.current = now;
  };

  const translate = `calc(${-index * 100}% + ${dragX}px)`;

  return (
    <div ref={containerRef} className="fade-in fixed inset-0 z-50 flex flex-col bg-background">
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
      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center md:px-16">
        {/* Zoom overlay — covers stage, blocks swipe, enables pan */}
        {zoomed && (
          <div
            ref={overlayRef}
            className={`absolute inset-0 z-20 touch-none overflow-hidden bg-background ${panning ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={zoomPointerDown}
            onPointerMove={zoomPointerMove}
            onPointerUp={zoomPointerUp}
            onPointerCancel={zoomPointerUp}
            onClick={handleOverlayClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              draggable={false}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${pinchScale})`,
                maxWidth: "none",
                maxHeight: "none",
                userSelect: "none",
                pointerEvents: "none",
                transition: pinchScale !== 1 ? "none" : undefined,
              }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={1.25} />
        </button>

        {/* Sliding track */}
        <div
          className="relative h-full w-full touch-pan-y overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={handleTrackClick}
        >
          <div
            ref={trackRef}
            className="flex h-full"
            style={{
              transform: `translate3d(${translate}, 0, 0)`,
              transition: dragging
                ? "none"
                : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {photos.map((p, i) => (
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
                  style={i === index && pinchScale !== 1
                    ? { transform: `scale(${pinchScale})`, transition: "none" }
                    : undefined}
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

      {/* Bottom strip + details panel */}
      <div className="relative z-30 shrink-0">
        <div
          className="absolute inset-x-0 bottom-full overflow-hidden transition-[max-height] duration-[400ms] ease-in-out"
          style={{ maxHeight: detailsOpen ? "50vh" : "0px" }}
        >
          <PhotoDetails photo={photo} />
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex w-full items-end justify-between bg-background/90 px-6 py-5 text-left backdrop-blur-md md:px-10"
        >
          <div>
            <p className="eyebrow text-muted-foreground">
              {photo.category}
              {photo.location ? ` — ${photo.location}` : ""}
              {photo.where ? ` · ${photo.where}` : ""}
            </p>
            {photo.title && (
              <h2 className="mt-1 font-serif text-2xl leading-tight">
                {photo.title}
              </h2>
            )}
          </div>
          <ChevronDown
            className={`mb-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
              detailsOpen ? "" : "rotate-180"
            }`}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}
