"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string };
type Location = { id: string; name: string };

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

export default function UploadPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [takenWhere, setTakenWhere] = useState("");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Categories and locations are independent lists — load both on mount.
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []))
      .catch(() => setLocations([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultUrl("");

    if (!file) {
      setStatus("Please choose an image file.");
      return;
    }
    if (!categoryId) {
      setStatus("Please choose a category.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Read image dimensions in the browser (before upload).
      setStatus("Reading image…");
      const { width, height } = await getImageDimensions(file);

      // 2. Get a presigned upload URL.
      setStatus("Requesting upload URL…");
      const presignRes = await fetch("/api/admin/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL.");
      const { presignedUrl, key, publicUrl } = await presignRes.json();

      // 3. Upload the file directly to R2.
      setStatus("Uploading to R2…");
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload to R2 failed.");

      // 4. Save metadata to the database.
      setStatus("Saving photo…");
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const saveRes = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          categoryId,
          locationId: locationId === "none" ? null : locationId,
          takenAt: takenAt || null,
          takenWhere: takenWhere || null,
          r2Key: key,
          r2Url: publicUrl,
          width,
          height,
          featured,
          tags: tagList,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save photo.");

      setStatus("");
      setResultUrl(publicUrl);

      // Reset the fields (keep category/location for quick repeat uploads).
      setTitle("");
      setDescription("");
      setTakenAt("");
      setTakenWhere("");
      setTags("");
      setFeatured(false);
      setFile(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Photo</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline">
          ← Back to dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New photo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                items={Object.fromEntries(
                  categories.map((c) => [c.id, c.name] as const)
                )}
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "")}
              >
                <SelectTrigger>
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
              <Label>Location (optional)</Label>
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
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="takenAt">Date taken</Label>
                <Input
                  id="takenAt"
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="takenWhere">Where taken</Label>
                <Input
                  id="takenWhere"
                  value={takenWhere}
                  onChange={(e) => setTakenWhere(e.target.value)}
                  placeholder="e.g. Near Lower Sabie Rest Camp"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated, e.g. lion, sunset, wildlife"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(v) => setFeatured(v === true)}
              />
              <Label htmlFor="featured">Featured (pin to top of the gallery)</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Image file</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>

            {resultUrl ? (
              <div className="space-y-4 rounded-lg border border-border bg-card/50 p-5 text-center">
                <a href={resultUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultUrl}
                    alt="Uploaded photo"
                    className="mx-auto max-h-56 rounded-md object-contain"
                  />
                </a>
                <p className="text-sm font-medium">✓ Photo uploaded</p>
                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResultUrl("");
                      setStatus("");
                    }}
                  >
                    Upload another
                  </Button>
                  <Button type="button" onClick={() => router.push("/")}>
                    View gallery
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Uploading…" : "Upload photo"}
                </Button>
                {status && (
                  <p className="text-sm text-muted-foreground">{status}</p>
                )}
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
