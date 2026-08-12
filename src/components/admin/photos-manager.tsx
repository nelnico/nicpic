"use client";

import { useEffect, useState } from "react";
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
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>

      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {photo.title || "Untitled"}
      </p>
    </div>
  );
}

export function PhotosManager() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [locations, setLocations] = useState<Opt[]>([]);
  const [albums, setAlbums] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePhoto | null>(null);
  const [createKey, setCreateKey] = useState(0);

  async function loadPhotos() {
    const data = await fetch("/api/photos?limit=0").then((r) => r.json());
    const list = Array.isArray(data) ? data : (data?.photos ?? []);
    setPhotos(list);
  }

  useEffect(() => {
    const get = (k: string, set: (v: Opt[]) => void) =>
      fetch(`/api/admin/${k}`)
        .then((r) => r.json())
        .then((d) => set(Array.isArray(d) ? d : []))
        .catch(() => set([]));
    get("categories", setCategories);
    get("locations", setLocations);
    get("albums", setAlbums);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPhotos()
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {photos.map((p) => (
              <PhotoThumb key={p.id} photo={p} onEdit={openEdit} />
            ))}
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
        onSaved={loadPhotos}
      />
    </Card>
  );
}
