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
import { AdvancedPhotoFields } from "@/components/advanced-photo-fields";

type Opt = { id: string; name: string };

export type EditablePhoto = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  locationId: string;
  cameraId: string;
  lensId: string;
  iso: string;
  aperture: string;
  shutterSpeed: string;
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

export function PhotoDialog({
  open,
  onOpenChange,
  photo,
  categories,
  locations,
  cameras,
  lenses,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo: EditablePhoto | null; // null = create mode
  categories: Opt[];
  locations: Opt[];
  cameras: Opt[];
  lenses: Opt[];
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
  const [cameraId, setCameraId] = useState(photo?.cameraId ?? "none");
  const [lensId, setLensId] = useState(photo?.lensId ?? "none");
  const [iso, setIso] = useState(photo?.iso ?? "none");
  const [aperture, setAperture] = useState(photo?.aperture ?? "none");
  const [shutterSpeed, setShutterSpeed] = useState(photo?.shutterSpeed ?? "none");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const advancedOpen = isEdit
    ? [photo!.cameraId, photo!.lensId, photo!.iso, photo!.aperture, photo!.shutterSpeed].some(
        (v) => v && v !== "none"
      )
    : false;

  function metaBody() {
    return {
      title: title || null,
      description: description || null,
      categoryId,
      locationId: locationId === "none" ? null : locationId,
      cameraId: cameraId === "none" ? null : cameraId,
      lensId: lensId === "none" ? null : lensId,
      iso: iso === "none" ? null : iso,
      aperture: aperture === "none" ? null : aperture,
      shutterSpeed: shutterSpeed === "none" ? null : shutterSpeed,
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
    const { width, height } = await getImageDimensions(f);

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
    const saveRes = await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...metaBody(), r2Key: key, r2Url: publicUrl, width, height }),
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
              <Label htmlFor="pd-when">When taken</Label>
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
                  category, location, date, gear, and tags. Edit titles &amp;
                  descriptions individually afterwards.
                </p>
              )}
            </div>
          )}

          <AdvancedPhotoFields
            cameras={cameras}
            lenses={lenses}
            cameraId={cameraId}
            setCameraId={setCameraId}
            lensId={lensId}
            setLensId={setLensId}
            iso={iso}
            setIso={setIso}
            aperture={aperture}
            setAperture={setAperture}
            shutterSpeed={shutterSpeed}
            setShutterSpeed={setShutterSpeed}
            defaultOpen={advancedOpen}
          />

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
