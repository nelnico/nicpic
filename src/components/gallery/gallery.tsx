"use client";

import { Lightbox } from "@/components/gallery/lightbox";
import { PhotoCard } from "@/components/gallery/photo-card";
import { SearchBar } from "@/components/gallery/search-bar";
import type { Photo } from "@/types/photo";
import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 30;

interface GalleryProps {
  photos: Photo[];
  initialNextCursor: number | null;
  albumMode?: boolean;
  initialSelectedId?: string | null;
}

function mapApiPhoto(p: Record<string, unknown>): Photo {
  const category = p.category as { name: string };
  const location = p.location as { name: string } | null;
  const tags = p.tags as { tag: { name: string } }[];
  const takenAt = p.takenAt as string | null;

  return {
    id: p.id as string,
    src: p.r2Url as string,
    thumbnail: (p.r2ThumbUrl ?? p.r2Url) as string,
    width: p.width as number,
    height: p.height as number,
    title: (p.title ?? "") as string,
    description: (p.description ?? "") as string,
    category: category.name,
    location: location?.name ?? "",
    where: (p.takenWhere ?? "") as string,
    date: takenAt
      ? new Date(takenAt).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "",
    tags: tags.map((t) => t.tag.name),
    cameraMake: (p.cameraMake ?? "") as string,
    cameraModel: (p.cameraModel ?? "") as string,
    iso: (p.iso ?? "") as string,
    aperture: (p.aperture ?? "") as string,
    shutterSpeed: (p.shutterSpeed ?? "") as string,
    focalLength: (p.focalLength ?? "") as string,
    exposureMode: (p.exposureMode ?? "") as string,
    meteringMode: (p.meteringMode ?? "") as string,
    flash: (p.flash ?? "") as string,
  };
}

export function Gallery({
  photos: initialPhotos,
  initialNextCursor,
  albumMode = false,
  initialSelectedId = null,
}: GalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef<number | null>(initialNextCursor);

  const fetchPhotos = useCallback(
    async (q: string, cur: number | null) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(LIMIT) });
        if (q) params.set("q", q);
        if (cur !== null) params.set("cursor", String(cur));

        const res = await fetch(`/api/photos?${params}`);
        const data = (await res.json()) as {
          photos: Record<string, unknown>[];
          nextCursor: number | null;
        };

        const mapped = data.photos.map(mapApiPhoto);
        setPhotos(cur === null ? mapped : (prev) => [...prev, ...mapped]);
        cursorRef.current = data.nextCursor;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  // Reset and reload when the search query changes (skip on first render — SSR data is already loaded)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPhotos([]);
    cursorRef.current = null;
    fetchPhotos(query, null);
  }, [query, fetchPhotos]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (albumMode) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && cursorRef.current !== null) {
          fetchPhotos(query, cursorRef.current);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query, fetchPhotos, albumMode]);

  // Once a page fetched for lightbox navigation lands, jump to the photo that was waiting on it
  useEffect(() => {
    if (pendingIndex !== null && pendingIndex < photos.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(photos[pendingIndex].id);
      setPendingIndex(null);
    }
  }, [photos, pendingIndex]);

  const handleNavigate = useCallback(
    (dir: number) => {
      setSelectedId((curId) => {
        const curIndex = photos.findIndex((p) => p.id === curId);
        if (curIndex === -1) return curId;

        const nextIndex = curIndex + dir;

        if (nextIndex >= 0 && nextIndex < photos.length) {
          return photos[nextIndex].id;
        }

        if (nextIndex >= photos.length) {
          if (cursorRef.current !== null) {
            setPendingIndex(nextIndex);
            fetchPhotos(query, cursorRef.current);
            return curId;
          }
          // No more pages left — loop back to the first photo
          return photos[0]?.id ?? curId;
        }

        // Stepped before the first loaded photo — loop to the last one loaded
        return photos[photos.length - 1]?.id ?? curId;
      });
    },
    [photos, query, fetchPhotos],
  );

  const selectedIndex = photos.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-background">

      {!albumMode && (
        <div className="sticky top-12 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <SearchBar onChange={setQuery} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-6 md:px-10">
        <section id="work" className="pb-10">
          {photos.length === 0 && !loading ? (
            <div className="mt-10 flex min-h-[40vh] items-center justify-center">
              <p className="eyebrow text-muted-foreground">
                {query ? "No matches found" : "No photos yet"}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`${albumMode ? "" : "mt-3 "}grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}
                style={{ gridAutoRows: "4px", gap: "12px" }}
              >
                {photos.map((photo, i) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={i}
                    onSelect={(p) => setSelectedId(p.id)}
                  />
                ))}
              </div>

              {/* Sentinel + loading indicator */}
              <div ref={sentinelRef} className="mt-8 flex justify-center">
                {loading && (
                  <p className="eyebrow text-muted-foreground">Loading…</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {selected && (
        <Lightbox
          photos={photos}
          index={selectedIndex}
          onClose={() => setSelectedId(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
