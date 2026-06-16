"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string };
type Location = { id: string; name: string };

type PhotoData = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  locationId: string; // "none" when not set
  takenAt: string; // yyyy-mm-dd or ""
  takenWhere: string;
  featured: boolean;
  tags: string[];
  r2Url: string;
};

export function PhotoEditForm({
  photo,
  categories,
  locations,
}: {
  photo: PhotoData;
  categories: Category[];
  locations: Location[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(photo.title);
  const [description, setDescription] = useState(photo.description);
  const [categoryId, setCategoryId] = useState(photo.categoryId);
  const [locationId, setLocationId] = useState(photo.locationId);
  const [takenAt, setTakenAt] = useState(photo.takenAt);
  const [takenWhere, setTakenWhere] = useState(photo.takenWhere);
  const [featured, setFeatured] = useState(photo.featured);
  const [tags, setTags] = useState(photo.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      setStatus("Please choose a category.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) throw new Error("Failed to save changes.");
      router.push("/admin/photos");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Photo</h1>
        <Link
          href="/admin/photos"
          className="text-sm text-muted-foreground underline"
        >
          ← Back to photos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.r2Url}
              alt={title || "photo"}
              className="mx-auto max-h-48 rounded-md object-contain"
            />

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

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/photos")}
              >
                Cancel
              </Button>
            </div>

            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
