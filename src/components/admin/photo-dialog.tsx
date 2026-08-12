"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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

export type EditablePhoto = {
  id: string;
  title: string;
  categoryId: string;
  locationId: string;
  albumId: string;
  takenAt: string;
  tags: string[];
  r2Url: string;
};

async function getImageDimensions(file: File) {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

type ExifData = {
  cameraMake?: string;
  cameraModel?: string;
  iso?: string;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  exposureMode?: string;
  meteringMode?: string;
  flash?: string;
  takenAt?: string;
};

function formatShutterSpeed(t: number): string {
  if (t >= 1) return `${t}s`;
  return `1/${Math.round(1 / t)}`;
}

const EXPOSURE_MODE: Record<number, string> = { 0: "Auto", 1: "Manual", 2: "Bracket" };
const METERING_MODE: Record<number, string> = {
  0: "Unknown", 1: "Average", 2: "Center-weighted",
  3: "Spot", 4: "Multi-spot", 5: "Pattern", 6: "Partial",
};

async function extractExif(file: File): Promise<ExifData> {
  try {
    const exifr = (await import("exifr")).default;
    const raw = await exifr.parse(file, { tiff: true, exif: true, gps: false, reviveValues: true });

    const out: ExifData = {};
    if (!raw) return out;

    if (raw.Make) out.cameraMake = String(raw.Make).trim();
    if (raw.Model) out.cameraModel = String(raw.Model).trim();
    if (raw.ISO) out.iso = String(raw.ISO);
    if (raw.FNumber) out.aperture = `f/${raw.FNumber}`;
    if (raw.ExposureTime) out.shutterSpeed = formatShutterSpeed(raw.ExposureTime as number);
    if (raw.FocalLength) out.focalLength = `${raw.FocalLength}mm`;
    if (raw.ExposureMode != null) out.exposureMode = EXPOSURE_MODE[raw.ExposureMode as number] ?? String(raw.ExposureMode);
    if (raw.MeteringMode != null) out.meteringMode = METERING_MODE[raw.MeteringMode as number] ?? String(raw.MeteringMode);
    // Flash is a bitmask; bit 0 = fired
    if (raw.Flash != null) out.flash = (raw.Flash as number) & 1 ? "Fired" : "No flash";
    if (raw.DateTimeOriginal instanceof Date) {
      const d = raw.DateTimeOriginal;
      out.takenAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return out;
  } catch (err) {
    console.error("EXIF extraction failed:", err);
    return {};
  }
}

// Small inline dialog for quickly adding a category, location, or album
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

export function PhotoDialog({
  open,
  onOpenChange,
  photo,
  categories,
  locations,
  albums,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: EditablePhoto | null;
  categories: Opt[];
  locations: Opt[];
  albums: Opt[];
  onSaved: () => void;
}) {
  const isEdit = photo !== null;

  const [categoryId, setCategoryId] = useState(photo?.categoryId ?? "");
  const [locationId, setLocationId] = useState(photo?.locationId ?? "none");
  const [albumId, setAlbumId] = useState(photo?.albumId ?? "none");
  const [title, setTitle] = useState(photo?.title ?? "");
  const [takenAt, setTakenAt] = useState(photo?.takenAt ?? "");
  const [tags, setTags] = useState(photo?.tags.join(", ") ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Local mutable copies of the lists (so quick-add updates are reflected immediately)
  const [localCategories, setLocalCategories] = useState<Opt[]>(categories);
  const [localLocations, setLocalLocations] = useState<Opt[]>(locations);
  const [localAlbums, setLocalAlbums] = useState<Opt[]>(albums);

  // Quick-add dialog open state
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [addAlbOpen, setAddAlbOpen] = useState(false);

  // Sync lists from props each time the dialog opens
  const [prevOpenMain, setPrevOpenMain] = useState(open);
  if (prevOpenMain !== open) {
    setPrevOpenMain(open);
    if (open) {
      setLocalCategories(categories);
      setLocalLocations(locations);
      setLocalAlbums(albums);
    }
  }

  function metaBody() {
    return {
      title: title || null,
      categoryId,
      locationId: locationId === "none" ? null : locationId,
      albumId: albumId === "none" ? null : albumId,
      takenAt: takenAt || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
  }

  async function uploadOne(f: File, label: string) {
    setStatus(`${label} — reading image…`);
    const [{ width, height }, exif] = await Promise.all([
      getImageDimensions(f),
      extractExif(f),
    ]);

    setStatus(`${label} — requesting upload URL…`);
    const presignRes = await fetch("/api/admin/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, contentType: f.type }),
    });
    if (!presignRes.ok) throw new Error(`${label}: failed to get upload URL.`);
    const { presignedUrl, key, publicUrl, thumbKey } = await presignRes.json();

    setStatus(`${label} — uploading to R2…`);
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      body: f,
      headers: { "Content-Type": f.type },
    });
    if (!uploadRes.ok) throw new Error(`${label}: upload to R2 failed.`);

    setStatus(`${label} — generating thumbnail & saving…`);
    const formData = metaBody();
    const saveRes = await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...exif,
        ...formData,
        // form takenAt wins if set; otherwise keep EXIF takenAt
        takenAt: formData.takenAt || exif.takenAt || null,
        r2Key: key,
        r2Url: publicUrl,
        thumbKey,
        width,
        height,
      }),
    });
    if (!saveRes.ok) throw new Error(`${label}: failed to save.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      setStatus("Please choose a category.");
      return;
    }
    if (!isEdit && files.length === 0) {
      setStatus("Please choose at least one image file.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      if (isEdit) {
        let replaceFields: {
          r2Key: string;
          r2Url: string;
          thumbKey: string;
          width: number;
          height: number;
        } | null = null;
        let exif: ExifData = {};

        if (files.length > 0) {
          const f = files[0];
          setStatus("Replacing image — reading file…");
          const [{ width, height }, exifData] = await Promise.all([
            getImageDimensions(f),
            extractExif(f),
          ]);
          exif = exifData;

          setStatus("Replacing image — requesting upload URL…");
          const presignRes = await fetch("/api/admin/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: f.name, contentType: f.type }),
          });
          if (!presignRes.ok) throw new Error("Failed to get upload URL.");
          const { presignedUrl, key, publicUrl, thumbKey } = await presignRes.json();

          setStatus("Replacing image — uploading to R2…");
          const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            body: f,
            headers: { "Content-Type": f.type },
          });
          if (!uploadRes.ok) throw new Error("Upload to R2 failed.");

          replaceFields = { r2Key: key, r2Url: publicUrl, thumbKey, width, height };
          setStatus("Saving changes…");
        }

        const meta = metaBody();
        const res = await fetch(`/api/admin/photos/${photo!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...meta,
            takenAt: meta.takenAt || exif.takenAt || null,
            // Replacing the file also resets EXIF metadata to match it.
            ...(files.length > 0
              ? {
                  cameraMake: exif.cameraMake ?? null,
                  cameraModel: exif.cameraModel ?? null,
                  iso: exif.iso ?? null,
                  aperture: exif.aperture ?? null,
                  shutterSpeed: exif.shutterSpeed ?? null,
                  focalLength: exif.focalLength ?? null,
                  exposureMode: exif.exposureMode ?? null,
                  meteringMode: exif.meteringMode ?? null,
                  flash: exif.flash ?? null,
                }
              : {}),
            ...(replaceFields ?? {}),
          }),
        });
        if (!res.ok) throw new Error("Failed to save changes.");
      } else {
        for (let i = 0; i < files.length; i++) {
          const label =
            files.length > 1 ? `Photo ${i + 1} of ${files.length}` : "Photo";
          await uploadOne(files[i], label);
        }
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this photo? This also removes it from R2.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/photos/${photo!.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      } else {
        setStatus("Failed to delete.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit photo" : "Upload photo"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isEdit && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo!.r2Url}
                alt={title || "photo"}
                className="mx-auto max-h-48 rounded-md object-contain"
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex items-center gap-1.5">
                  <Select
                    items={Object.fromEntries(
                      localCategories.map((c) => [c.id, c.name] as const)
                    )}
                    value={categoryId}
                    onValueChange={(v) => setCategoryId(v ?? "")}
                  >
                    <SelectTrigger className="w-full flex-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {localCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
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
                    items={{
                      none: "No location",
                      ...Object.fromEntries(
                        localLocations.map((l) => [l.id, l.name] as const)
                      ),
                    }}
                    value={locationId}
                    onValueChange={(v) => setLocationId(v ?? "none")}
                  >
                    <SelectTrigger className="w-full flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No location</SelectItem>
                      {localLocations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
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
            </div>

            <div className="space-y-2">
              <Label>Album</Label>
              <div className="flex items-center gap-1.5">
                <Select
                  items={{ none: "No album", ...Object.fromEntries(localAlbums.map((a) => [a.id, a.name])) }}
                  value={albumId}
                  onValueChange={(v) => setAlbumId(v ?? "none")}
                >
                  <SelectTrigger className="w-full flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No album</SelectItem>
                    {localAlbums.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-base"
                  onClick={() => setAddAlbOpen(true)}
                  title="Add album"
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                When taken
                {!isEdit && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (auto-filled from EXIF if blank)
                  </span>
                )}
              </Label>
              <DatePicker
                value={takenAt}
                onChange={setTakenAt}
                placeholder="Pick a date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-title">Title</Label>
              <Input
                id="pd-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-tags">Tags</Label>
              <Input
                id="pd-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated, e.g. lion, sunset, wildlife"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-file">
                {isEdit ? "Replace image (optional)" : "Image files"}
              </Label>
              <Input
                id="pd-file"
                type="file"
                accept="image/*"
                multiple={!isEdit}
                onChange={(e) =>
                  setFiles(e.target.files ? Array.from(e.target.files) : [])
                }
              />
              {isEdit && files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  This replaces the current photo, thumbnail, and EXIF data.
                  The old file will be deleted from R2.
                </p>
              )}
              {!isEdit && files.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} photos selected — all will share the same
                  category, location, date, and tags. EXIF is read per-file.
                  Edit titles individually afterwards.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                {isEdit && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {status && (
                  <span className="text-sm text-muted-foreground">{status}</span>
                )}
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Working…"
                    : isEdit
                      ? "Save changes"
                      : files.length > 1
                        ? `Upload ${files.length} photos`
                        : "Upload photo"}
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
        placeholder="e.g. People"
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

      <QuickAddDialog
        open={addAlbOpen}
        onOpenChange={setAddAlbOpen}
        title="Add album"
        placeholder="e.g. Game Reserve 2024"
        existingNames={localAlbums.map((a) => a.name)}
        apiPath="/api/admin/albums"
        onAdded={(item) => {
          setLocalAlbums((prev) => [...prev, item]);
          setAlbumId(item.id);
        }}
      />
    </>
  );
}
