"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Location = { id: string; name: string };
type Album = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  locationId: string | null;
  location: Location | null;
  coverPhotoId: string | null;
  coverPhoto: { r2ThumbUrl: string | null; r2Url: string } | null;
  _count: { photos: number };
};

function AlbumDialog({
  open,
  onOpenChange,
  album,
  locations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  album: Album | null;
  locations: Location[];
  onSaved: () => void;
}) {
  const isEdit = album !== null;
  const [name, setName] = useState(album?.name ?? "");
  const [description, setDescription] = useState(album?.description ?? "");
  const [locationId, setLocationId] = useState(album?.locationId ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(album?.name ?? "");
    setDescription(album?.description ?? "");
    setLocationId(album?.locationId ?? "none");
    setError("");
  }, [album, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        locationId: locationId === "none" ? null : locationId,
      };
      const res = await fetch(
        isEdit ? `/api/admin/albums/${album!.id}` : "/api/admin/albums",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save album.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete album "${album!.name}"? Photos won't be deleted.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/albums/${album!.id}`, { method: "DELETE" });
      onSaved();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit album" : "New album"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="al-name">Name</Label>
            <Input
              id="al-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Game Reserve 2024"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="al-desc">Description</Label>
            <Textarea
              id="al-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              items={{ none: "No location", ...Object.fromEntries(locations.map((l) => [l.id, l.name])) }}
              value={locationId}
              onValueChange={(v) => setLocationId(v ?? "none")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No location</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              {isEdit && (
                <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {error && <span className="text-sm text-destructive">{error}</span>}
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AlbumsManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);

  async function load() {
    const [albumsRes, locRes] = await Promise.all([
      fetch("/api/admin/albums"),
      fetch("/api/admin/locations"),
    ]);
    setAlbums(await albumsRes.json());
    setLocations(await locRes.json());
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(a: Album) { setEditing(a); setDialogOpen(true); }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-medium">Albums</h2>
        <Button size="sm" onClick={openNew}>Add</Button>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-muted-foreground">No albums yet.</p>
      ) : (
        <ul className="space-y-2">
          {albums.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                {(a.coverPhoto?.r2ThumbUrl || a.coverPhoto?.r2Url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.coverPhoto.r2ThumbUrl ?? a.coverPhoto.r2Url}
                    alt={a.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div>
                  <span className="font-medium">{a.name}</span>
                  {a.location && (
                    <span className="ml-2 text-muted-foreground">{a.location.name}</span>
                  )}
                  <span className="ml-2 text-muted-foreground">({a._count.photos})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/albums/${a.id}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Photos
                </Link>
                <button
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => openEdit(a)}
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlbumDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        album={editing}
        locations={locations}
        onSaved={load}
      />
    </div>
  );
}
