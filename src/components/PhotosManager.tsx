"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoDialog, type EditablePhoto } from "@/components/PhotoDialog";

type Opt = { id: string; name: string };

type ApiPhoto = {
  id: string;
  title: string | null;
  description: string | null;
  r2Url: string;
  featured: boolean;
  categoryId: string;
  locationId: string | null;
  cameraId: string | null;
  lensId: string | null;
  iso: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  takenAt: string | null;
  takenWhere: string | null;
  tags: { tag: { name: string } }[];
};

function toEditable(p: ApiPhoto): EditablePhoto {
  return {
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    categoryId: p.categoryId,
    locationId: p.locationId ?? "none",
    cameraId: p.cameraId ?? "none",
    lensId: p.lensId ?? "none",
    iso: p.iso ?? "none",
    aperture: p.aperture ?? "none",
    shutterSpeed: p.shutterSpeed ?? "none",
    takenAt: p.takenAt ? p.takenAt.slice(0, 10) : "",
    takenWhere: p.takenWhere ?? "",
    featured: p.featured,
    tags: p.tags.map((t) => t.tag.name),
    r2Url: p.r2Url,
  };
}

export function PhotosManager() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [locations, setLocations] = useState<Opt[]>([]);
  const [cameras, setCameras] = useState<Opt[]>([]);
  const [lenses, setLenses] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePhoto | null>(null);
  const [createKey, setCreateKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPhotos() {
    const data = await fetch("/api/photos").then((r) => r.json());
    setPhotos(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    const get = (k: string, set: (v: Opt[]) => void) =>
      fetch(`/api/admin/${k}`)
        .then((r) => r.json())
        .then((d) => set(Array.isArray(d) ? d : []))
        .catch(() => set([]));
    get("categories", setCategories);
    get("locations", setLocations);
    get("cameras", setCameras);
    get("lenses", setLenses);
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

  async function toggleFeatured(p: ApiPhoto) {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/photos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !p.featured }),
      });
      if (res.ok) await loadPhotos();
    } finally {
      setBusyId(null);
    }
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {photos.map((p) => (
              <div key={p.id} className="group relative">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="block w-full overflow-hidden rounded-md border border-border"
                  title="Edit"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.r2Url}
                    alt={p.title ?? "photo"}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => toggleFeatured(p)}
                  disabled={busyId === p.id}
                  aria-label="Toggle featured"
                  title={p.featured ? "Featured (click to unfeature)" : "Mark featured"}
                  className="absolute left-2 top-2 rounded-full bg-background/70 p-1 backdrop-blur-sm transition-colors hover:bg-background"
                >
                  <Star
                    className={`h-4 w-4 ${
                      p.featured
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {p.title || "Untitled"}
                </p>
              </div>
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
        cameras={cameras}
        lenses={lenses}
        onSaved={loadPhotos}
      />
    </Card>
  );
}
