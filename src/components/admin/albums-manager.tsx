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

type Opt = { id: string; name: string };
type AccessCode = { id: string; code: string; expiresAt: string; createdAt: string };
type Album = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPrivate: boolean;
  categoryId: string | null;
  category: Opt | null;
  locationId: string | null;
  location: Opt | null;
  coverPhotoId: string | null;
  coverPhoto: { r2ThumbUrl: string | null; r2Url: string } | null;
  accessCodes: AccessCode[];
  _count: { photos: number };
};

function hoursUntil(isoString: string) {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function QuickAddDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  existingNames,
  apiPath,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  placeholder: string;
  existingNames: string[];
  apiPath: string;
  onAdded: (item: Opt) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) { setName(""); setError(""); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required."); return; }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError("Already exists."); return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        return;
      }
      const item = await res.json();
      onAdded({ id: item.id, name: item.name });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AlbumDialog({
  open,
  onOpenChange,
  album,
  categories,
  locations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  album: Album | null;
  categories: Opt[];
  locations: Opt[];
  onSaved: () => void;
}) {
  const isEdit = album !== null;
  const [name, setName] = useState(album?.name ?? "");
  const [description, setDescription] = useState(album?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(album?.isPrivate ?? false);
  const [categoryId, setCategoryId] = useState(album?.categoryId ?? "none");
  const [locationId, setLocationId] = useState(album?.locationId ?? "none");
  const [codes, setCodes] = useState<AccessCode[]>(album?.accessCodes ?? []);
  const [busy, setBusy] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState("");

  const [localCategories, setLocalCategories] = useState<Opt[]>(categories);
  const [localLocations, setLocalLocations] = useState<Opt[]>(locations);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setName(album?.name ?? "");
      setDescription(album?.description ?? "");
      setIsPrivate(album?.isPrivate ?? false);
      setCategoryId(album?.categoryId ?? "none");
      setLocationId(album?.locationId ?? "none");
      setCodes(album?.accessCodes ?? []);
      setError("");
      setLocalCategories(categories);
      setLocalLocations(locations);
    }
  }

  useEffect(() => { setLocalCategories(categories); }, [categories]);
  useEffect(() => { setLocalLocations(locations); }, [locations]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setBusy(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        isPrivate,
        categoryId: categoryId === "none" ? null : categoryId,
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

  async function generateCode() {
    if (!isEdit) return;
    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/admin/albums/${album!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateCode: true }),
      });
      if (!res.ok) throw new Error("Failed to generate code.");
      const updated = await res.json();
      setCodes(updated.accessCodes ?? []);
      onSaved();
    } finally {
      setGeneratingCode(false);
    }
  }

  async function revokeCode(codeId: string) {
    await fetch(`/api/admin/album-codes/${codeId}`, { method: "DELETE" });
    setCodes((prev) => prev.filter((c) => c.id !== codeId));
    onSaved();
  }

  const activeCodes = codes.filter((c) => new Date(c.expiresAt) > new Date());

  return (
    <>
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
              <Label>Category</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  items={{ none: "No category", ...Object.fromEntries(localCategories.map((c) => [c.id, c.name])) }}
                  value={categoryId}
                  onValueChange={(v) => setCategoryId(v ?? "none")}
                >
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {localCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-base"
                  onClick={() => setAddCatOpen(true)}
                  title="Add category"
                >
                  +
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  items={{ none: "No location", ...Object.fromEntries(localLocations.map((l) => [l.id, l.name])) }}
                  value={locationId}
                  onValueChange={(v) => setLocationId(v ?? "none")}
                >
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {localLocations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-base"
                  onClick={() => setAddLocOpen(true)}
                  title="Add location"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Private toggle */}
            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
              <input
                id="al-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
              <Label htmlFor="al-private" className="font-normal">
                Private album (requires access code to view)
              </Label>
            </div>

            {/* Access codes — only shown when editing an existing private album */}
            {isEdit && isPrivate && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Access codes</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={generatingCode}
                    onClick={generateCode}
                  >
                    {generatingCode ? "Generating…" : "Generate code"}
                  </Button>
                </div>
                {activeCodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active codes — generate one to share.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activeCodes.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm tracking-widest">{c.code}</span>
                        <span className="text-xs text-muted-foreground">
                          expires in {hoursUntil(c.expiresAt)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => revokeCode(c.id)}
                        >
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

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

      <QuickAddDialog
        open={addCatOpen}
        onOpenChange={setAddCatOpen}
        title="Add category"
        placeholder="e.g. Wildlife"
        existingNames={localCategories.map((c) => c.name)}
        apiPath="/api/admin/categories"
        onAdded={(item) => {
          setLocalCategories((prev) => [...prev, item]);
          setCategoryId(item.id);
        }}
      />

      <QuickAddDialog
        open={addLocOpen}
        onOpenChange={setAddLocOpen}
        title="Add location"
        placeholder="e.g. Cape Town"
        existingNames={localLocations.map((l) => l.name)}
        apiPath="/api/admin/locations"
        onAdded={(item) => {
          setLocalLocations((prev) => [...prev, item]);
          setLocationId(item.id);
        }}
      />
    </>
  );
}

export function AlbumsManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [locations, setLocations] = useState<Opt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);

  async function load() {
    const [albumsRes, catRes, locRes] = await Promise.all([
      fetch("/api/admin/albums"),
      fetch("/api/admin/categories"),
      fetch("/api/admin/locations"),
    ]);
    setAlbums(await albumsRes.json());
    setCategories(await catRes.json());
    setLocations(await locRes.json());
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(a: Album) { setEditing(a); setDialogOpen(true); }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-medium">Albums</h2>
        <Button size="sm" variant="outline" onClick={openNew}>Add</Button>
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
                <button
                  className="text-left hover:underline underline-offset-2"
                  onClick={() => openEdit(a)}
                >
                  <span className="font-medium">{a.name}</span>
                  {a.isPrivate && (
                    <span className="ml-2 text-xs text-muted-foreground">🔒</span>
                  )}
                  <span className="ml-2 text-muted-foreground">({a._count.photos})</span>
                </button>
              </div>
              <Link
                href={`/admin/albums/${a.id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Photos
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AlbumDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        album={editing}
        categories={categories}
        locations={locations}
        onSaved={load}
      />
    </div>
  );
}
