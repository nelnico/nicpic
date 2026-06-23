"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  description: string;
  categoryId: string;
  locationId: string;
  takenAt: string;
  takenWhere: string;
  featured: boolean;
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
  iso?: string;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  focalLength35mm?: string;
  exposureMode?: string;
  meteringMode?: string;
  flash?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
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
    const raw = await exifr.parse(file, { tiff: true, exif: true, gps: true, reviveValues: true });

    const out: ExifData = {};
    if (!raw) return out;

    if (raw.ISO) out.iso = String(raw.ISO);
    if (raw.FNumber) out.aperture = `f/${raw.FNumber}`;
    if (raw.ExposureTime) out.shutterSpeed = formatShutterSpeed(raw.ExposureTime as number);
    if (raw.FocalLength) out.focalLength = `${raw.FocalLength}mm`;
    if (raw.FocalLengthIn35mmFilm) out.focalLength35mm = `${raw.FocalLengthIn35mmFilm}mm`;
    if (raw.ExposureMode != null) out.exposureMode = EXPOSURE_MODE[raw.ExposureMode as number] ?? String(raw.ExposureMode);
    if (raw.MeteringMode != null) out.meteringMode = METERING_MODE[raw.MeteringMode as number] ?? String(raw.MeteringMode);
    // Flash is a bitmask; bit 0 = fired
    if (raw.Flash != null) out.flash = (raw.Flash as number) & 1 ? "Fired" : "No flash";
    if (raw.DateTimeOriginal instanceof Date) {
      const d = raw.DateTimeOriginal;
      out.takenAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    if (raw.latitude != null) out.gpsLat = raw.latitude as number;
    if (raw.longitude != null) out.gpsLng = raw.longitude as number;
    if (raw.GPSAltitude != null) out.gpsAlt = raw.GPSAltitude as number;
    return out;
  } catch (err) {
    console.error("EXIF extraction failed:", err);
    return {};
  }
}

export function PhotoDialog({
  open,
  onOpenChange,
  photo,
  categories,
  locations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: EditablePhoto | null;
  categories: Opt[];
  locations: Opt[];
  onSaved: () => void;
}) {
  const isEdit = photo !== null;

  const [categoryId, setCategoryId] = useState(photo?.categoryId ?? "");
  const [locationId, setLocationId] = useState(photo?.locationId ?? "none");
  const [title, setTitle] = useState(photo?.title ?? "");
  const [description, setDescription] = useState(photo?.description ?? "");
  const [takenAt, setTakenAt] = useState(photo?.takenAt ?? "");
  const [takenWhere, setTakenWhere] = useState(photo?.takenWhere ?? "");
  const [tags, setTags] = useState(photo?.tags.join(", ") ?? "");
  const [featured, setFeatured] = useState(photo?.featured ?? false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function metaBody() {
    return {
      title: title || null,
      description: description || null,
      categoryId,
      locationId: locationId === "none" ? null : locationId,
      takenAt: takenAt || null,
      takenWhere: takenWhere || null,
      featured,
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
    const { presignedUrl, key, publicUrl } = await presignRes.json();

    setStatus(`${label} — uploading to R2…`);
    const uploadRes = await fetch(presignedUrl, {
      method: "PUT",
      body: f,
      headers: { "Content-Type": f.type },
    });
    if (!uploadRes.ok) throw new Error(`${label}: upload to R2 failed.`);

    setStatus(`${label} — saving…`);
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
        const res = await fetch(`/api/admin/photos/${photo!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metaBody()),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={featured}
              onCheckedChange={(v) => setFeatured(v === true)}
            />
            Featured (pin to top of the gallery)
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                items={Object.fromEntries(
                  categories.map((c) => [c.id, c.name] as const)
                )}
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                items={{
                  none: "No location",
                  ...Object.fromEntries(
                    locations.map((l) => [l.id, l.name] as const)
                  ),
                }}
                value={locationId}
                onValueChange={(v) => setLocationId(v ?? "none")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pd-where">Where taken</Label>
              <Input
                id="pd-where"
                value={takenWhere}
                onChange={(e) => setTakenWhere(e.target.value)}
                placeholder="e.g. Near Lower Sabie Rest Camp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-when">
                When taken
                {!isEdit && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (auto-filled from EXIF if blank)
                  </span>
                )}
              </Label>
              <Input
                id="pd-when"
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
            </div>
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
            <Label htmlFor="pd-desc">Description</Label>
            <Textarea
              id="pd-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="pd-file">Image files</Label>
              <Input
                id="pd-file"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setFiles(e.target.files ? Array.from(e.target.files) : [])
                }
              />
              {files.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} photos selected — all will share the same
                  category, location, date, and tags. EXIF is read per-file.
                  Edit titles &amp; descriptions individually afterwards.
                </p>
              )}
            </div>
          )}

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
  );
}
