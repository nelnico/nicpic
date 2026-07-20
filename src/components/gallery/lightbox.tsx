"use client";

import type { Photo } from "@/types/photo";
import { ArrowLeft, ArrowRight, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (dir: number) => void;
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
  const focalLength = photo.focalLength;

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

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef     = useRef<HTMLDivElement>(null);
  const trackRef     = useRef<HTMLDivElement>(null);

  // Swipe
  const startX   = useRef(0);
  const hasMoved = useRef(false);
  const lastTap  = useRef(0);

  // Pinch
  const pinchStartDist  = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchCenter     = useRef({ x: 0, y: 0 });
  const isPinching      = useRef(false);

  // Pan (single-finger while zoomed)
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Mirror zoom state in refs so event handlers always see current values
  const scaleRef = useRef(1);
  const panXRef  = useRef(0);
  const panYRef  = useRef(0);

  const [dragX,       setDragX]       = useState(0);
  const [dragging,    setDragging]    = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scale,       setScale]       = useState(1);
  const [panX,        setPanX]        = useState(0);
  const [panY,        setPanY]        = useState(0);
  const [pinchActive, setPinchActive] = useState(false);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panXRef.current  = panX;  }, [panX]);
  useEffect(() => { panYRef.current  = panY;  }, [panY]);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1; panXRef.current = 0; panYRef.current = 0;
    setScale(1); setPanX(0); setPanY(0);
  }, []);

  const go = useCallback((dir: number) => onNavigate(dir), [onNavigate]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (scaleRef.current > 1) { resetZoom(); return; }
        if (detailsOpen) { setDetailsOpen(false); return; }
        onClose();
      }
      if (scaleRef.current === 1) {
        if (e.key === "ArrowLeft")  go(-1);
        if (e.key === "ArrowRight") go(1);
      }
    },
    [onClose, go, detailsOpen, resetZoom],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = prev; };
  }, [handleKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDetailsOpen(false); resetZoom(); }, [index, resetZoom]);

  // Compute pan clamp bounds for a given scale
  function panBounds(s: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { maxX: 0, maxY: 0 };
    const cw = rect.width, ch = rect.height;
    const a = photo.width / photo.height;
    const rw = a > cw / ch ? cw : ch * a;
    const rh = a > cw / ch ? cw / a : ch;
    return { maxX: Math.max(0, (rw * s - cw) / 2), maxY: Math.max(0, (rh * s - ch) / 2) };
  }

  // Pinch-to-zoom via native touch events (need non-passive for preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function dist(t: TouchList) {
      return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      isPinching.current    = true;
      setPinchActive(true);
      pinchStartDist.current  = dist(e.touches);
      pinchStartScale.current = scaleRef.current;
      const rect = (stageRef.current ?? el)!.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchCenter.current = { x: mx - rect.left - rect.width / 2, y: my - rect.top - rect.height / 2 };
      panStart.current = null;
      setDragging(false);
      setDragX(0);
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPinching.current || e.touches.length !== 2) return;
      e.preventDefault();

      const ratio    = dist(e.touches) / pinchStartDist.current;
      const newScale = Math.max(1, Math.min(5, pinchStartScale.current * ratio));
      const change   = newScale / scaleRef.current;
      const { x: cx, y: cy } = pinchCenter.current;

      // Pan so the point under the pinch centre stays fixed on screen
      let nx = cx + (panXRef.current - cx) * change;
      let ny = cy + (panYRef.current - cy) * change;

      const { maxX, maxY } = (() => {
        const rect = (stageRef.current ?? el)!.getBoundingClientRect();
        const cw = rect.width, ch = rect.height;
        const a = photo.width / photo.height;
        const rw = a > cw / ch ? cw : ch * a;
        const rh = a > cw / ch ? cw / a : ch;
        return { maxX: Math.max(0, (rw * newScale - cw) / 2), maxY: Math.max(0, (rh * newScale - ch) / 2) };
      })();

      nx = Math.max(-maxX, Math.min(maxX, nx));
      ny = Math.max(-maxY, Math.min(maxY, ny));

      scaleRef.current = newScale; panXRef.current = nx; panYRef.current = ny;
      setScale(newScale); setPanX(nx); setPanY(ny);
    }

    function onTouchEnd() {
      isPinching.current = false;
      setPinchActive(false);
      if (scaleRef.current < 1.05) resetZoom();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [photo, resetZoom]);

  // ── Pointer handlers (swipe when scale=1, pan when scale>1) ─────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (isPinching.current) return;
    if (scaleRef.current > 1) {
      panStart.current = { x: e.clientX, y: e.clientY, panX: panXRef.current, panY: panYRef.current };
      return;
    }
    startX.current = e.clientX;
    hasMoved.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isPinching.current) return;
    if (scaleRef.current > 1) {
      if (!panStart.current) return;
      hasMoved.current = true;
      const { maxX, maxY } = panBounds(scaleRef.current);
      const nx = Math.max(-maxX, Math.min(maxX, panStart.current.panX + (e.clientX - panStart.current.x)));
      const ny = Math.max(-maxY, Math.min(maxY, panStart.current.panY + (e.clientY - panStart.current.y)));
      panXRef.current = nx; panYRef.current = ny;
      setPanX(nx); setPanY(ny);
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (!hasMoved.current && Math.abs(dx) > 5) hasMoved.current = true;
    setDragX(dx);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (scaleRef.current > 1) { panStart.current = null; hasMoved.current = false; return; }
    if (!dragging) return;
    setDragging(false);
    if (!hasMoved.current) { setDragX(0); return; }
    const delta     = e.clientX - startX.current;
    const threshold = Math.min(120, (trackRef.current?.clientWidth ?? 600) * 0.18);
    if (delta <= -threshold) go(1);
    else if (delta >= threshold) go(-1);
    setDragX(0);
  };

  // Double-tap: zoom to 2× centred on tap point, or reset if already zoomed
  const handleTrackClick = (e: React.MouseEvent) => {
    if (hasMoved.current) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (scaleRef.current > 1) {
        resetZoom();
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top  - rect.height / 2;
        const s  = 2;
        const { maxX, maxY } = panBounds(s);
        const nx = Math.max(-maxX, Math.min(maxX, -cx * (s - 1)));
        const ny = Math.max(-maxY, Math.min(maxY, -cy * (s - 1)));
        scaleRef.current = s; panXRef.current = nx; panYRef.current = ny;
        setScale(s); setPanX(nx); setPanY(ny);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
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
          style={{ cursor: scale > 1 ? "grab" : "default" }}
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
              transition: dragging ? "none" : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {photos.map((p, i) => (
              <div key={p.id} className="flex h-full w-full shrink-0 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.title}
                  width={p.width}
                  height={p.height}
                  draggable={false}
                  className="max-h-full max-w-full select-none object-contain"
                  style={i === index
                    ? {
                        transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                        transition: pinchActive ? "none" : "transform 0.2s ease-out",
                        willChange: "transform",
                      }
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
              <h2 className="mt-1 font-serif text-2xl leading-tight">{photo.title}</h2>
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
