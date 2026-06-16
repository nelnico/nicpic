"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Photo = {
  id: string;
  title: string | null;
  r2Url: string;
  featured: boolean;
  takenAt: string | null;
  createdAt: string;
  category: { name: string };
  location: { name: string } | null;
};

export default function ManagePhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggleFeatured(photo: Photo) {
    setBusyId(photo.id);
    try {
      const res = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !photo.featured }),
      });
      if (res.ok) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, featured: !p.featured } : p
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm("Delete this photo? This also removes it from R2.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Photos</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline">
          ← Back to dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet.{" "}
          <Link href="/admin/upload" className="underline">
            Upload one
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="p-3">Photo</th>
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Location</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-center">Featured</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {photos.map((photo) => (
                <tr key={photo.id} className="border-b last:border-0">
                  <td className="p-3">
                    {/* Plain img for admin thumbnails (avoids next/image remote config). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.r2Url}
                      alt={photo.title ?? "photo"}
                      className="h-12 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="p-3">{photo.title || "—"}</td>
                  <td className="p-3">{photo.category.name}</td>
                  <td className="p-3">{photo.location?.name ?? "—"}</td>
                  <td className="p-3">
                    {photo.takenAt
                      ? new Date(photo.takenAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Checkbox
                      checked={photo.featured}
                      disabled={busyId === photo.id}
                      onCheckedChange={() => toggleFeatured(photo)}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/photos/${photo.id}/edit`}
                        className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
                      >
                        Edit
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === photo.id}
                        onClick={() => deletePhoto(photo.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
