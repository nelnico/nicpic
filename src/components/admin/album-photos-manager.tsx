"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, XIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Photo = {
  id: string;
  title: string | null;
  r2Url: string;
  r2ThumbUrl: string | null;
};

type Album = {
  id: string;
  name: string;
  description: string | null;
};

export function AlbumPhotosManager({
  album,
  initialPhotos,
}: {
  album: Album;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [addOpen, setAddOpen] = useState(false);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function removeFromAlbum(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    await fetch(`/api/admin/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: null }),
    });
  }

  async function openAdd() {
    setSelected(new Set());
    setAddOpen(true);
    setAllLoading(true);
    try {
      const res = await fetch("/api/photos?limit=0").then((r) => r.json());
      const list: Photo[] = Array.isArray(res) ? res : (res?.photos ?? []);
      setAllPhotos(list);
    } finally {
      setAllLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const toAdd = allPhotos.filter((p) => selected.has(p.id));
      await Promise.all(
        toAdd.map((p) =>
          fetch(`/api/admin/photos/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ albumId: album.id }),
          })
        )
      );
      setPhotos((prev) => [...prev, ...toAdd]);
      setAddOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const albumPhotoIds = new Set(photos.map((p) => p.id));
  const available = allPhotos.filter((p) => !albumPhotoIds.has(p.id));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to admin"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{album.name}</h1>
          {album.description && (
            <p className="text-sm text-muted-foreground">{album.description}</p>
          )}
        </div>
        <Button size="sm" onClick={openAdd}>
          Add photos
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos in this album yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.r2ThumbUrl ?? p.r2Url}
                alt={p.title ?? "photo"}
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removeFromAlbum(p.id)}
                title="Remove from album"
                className="absolute right-0.5 top-0.5 hidden rounded bg-background/80 p-0.5 backdrop-blur-sm group-hover:flex"
              >
                <XIcon className="size-3 text-destructive" />
              </button>
              {p.title && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {p.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(v) => { if (!busy) setAddOpen(v); }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add photos to &ldquo;{album.name}&rdquo;</DialogTitle>
          </DialogHeader>

          {allLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All photos are already in this album.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Click to select.{selected.size > 0 && ` ${selected.size} selected.`}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {available.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className={`relative overflow-hidden rounded-md border-2 transition-colors ${
                        isSelected ? "border-primary" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.r2ThumbUrl ?? p.r2Url}
                        alt={p.title ?? "photo"}
                        className="aspect-square w-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                            <CheckIcon className="size-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={addSelected}
                  disabled={selected.size === 0 || busy}
                >
                  {busy
                    ? "Adding…"
                    : selected.size > 0
                      ? `Add ${selected.size} photo${selected.size !== 1 ? "s" : ""}`
                      : "Select photos"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
