"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoDialog, type EditablePhoto } from "@/components/admin/photo-dialog";

type Opt = { id: string; name: string };

type ApiPhoto = {
  id: string;
  title: string | null;
  r2Url: string;
  r2ThumbUrl: string | null;
  categoryId: string;
  locationId: string | null;
  takenAt: string | null;
  albumId: string | null;
  tags: { tag: { name: string } }[];
};

function toEditable(p: ApiPhoto): EditablePhoto {
  return {
    id: p.id,
    title: p.title ?? "",
    categoryId: p.categoryId,
    locationId: p.locationId ?? "none",
    takenAt: p.takenAt ? p.takenAt.slice(0, 10) : "",
    albumId: p.albumId ?? "none",
    tags: p.tags.map((t) => t.tag.name),
    r2Url: p.r2Url,
  };
}

function PhotoThumb({
  photo,
  onEdit,
}: {
  photo: ApiPhoto;
  onEdit: (p: ApiPhoto) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onEdit(photo)}
        className="block w-full overflow-hidden rounded-md border border-border"
        title="Edit"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.r2ThumbUrl ?? photo.r2Url}
          alt={photo.title ?? "photo"}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>

      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {photo.title || "Untitled"}
      </p>
    </div>
  );
}

const PAGE_SIZE = 48;

export function PhotosManager() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [locations, setLocations] = useState<Opt[]>([]);
  const [albums, setAlbums] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePhoto | null>(null);
  const [createKey, setCreateKey] = useState(0);

  // Cursor + in-flight flag live in refs so the observer callback always sees
  // current values without having to be torn down and rebuilt each page.
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (cursor: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const data = await fetch(`/api/photos?${params}`).then((r) => r.json());
      const list: ApiPhoto[] = Array.isArray(data) ? data : (data?.photos ?? []);
      cursorRef.current = data?.nextCursor ?? null;
      setPhotos((prev) => (cursor ? [...prev, ...list] : list));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  /** Reload from the top — used after an upload or edit changes the list. */
  const reloadPhotos = useCallback(async () => {
    cursorRef.current = null;
    await fetchPage(null);
  }, [fetchPage]);

  useEffect(() => {
    const get = (k: string, set: (v: Opt[]) => void) =>
      fetch(`/api/admin/${k}`)
        .then((r) => r.json())
        .then((d) => set(Array.isArray(d) ? d : []))
        .catch(() => set([]));
    get("categories", setCategories);
    get("locations", setLocations);
    get("albums", setAlbums);
    fetchPage(null)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  // Infinite scroll inside the fixed-height grid — `root` is the scroll box,
  // not the viewport, so the sentinel fires as the box itself nears its end.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && cursorRef.current !== null) {
          fetchPage(cursorRef.current);
        }
      },
      { root: scrollRef.current, rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage, loading]);

  function openCreate() {
    setCreateKey((k) => k + 1);
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ApiPhoto) {
    setEditing(toEditable(p));
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photos</CardTitle>
        <CardAction>
          <Button size="sm" onClick={openCreate}>
            Upload
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photos yet — hit <strong>Upload</strong> to add one.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="max-h-[60vh] overflow-y-auto pr-1"
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {photos.map((p) => (
                <PhotoThumb key={p.id} photo={p} onEdit={openEdit} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-px" />
          </div>
        )}
      </CardContent>

      <PhotoDialog
        key={editing?.id ?? createKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        photo={editing}
        categories={categories}
        locations={locations}
        albums={albums}
        onSaved={reloadPhotos}
      />
    </Card>
  );
}
