"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Location = { id: string; name: string };
type Category = { id: string; name: string; locations: Location[] };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [locationCategoryId, setLocationCategoryId] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await fetch("/api/admin/categories").then((r) => r.json());
    setCategories(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(() => setCategories([]));
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      setNewCategory("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.trim() || !locationCategoryId) return;
    setBusy(true);
    try {
      await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocation.trim(),
          categoryId: locationCategoryId,
        }),
      });
      setNewLocation("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories &amp; Locations</h1>
        <Link href="/admin" className="text-sm text-muted-foreground underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addCategory} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="category">Name</Label>
                <Input
                  id="category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Wildlife"
                />
              </div>
              <Button type="submit" disabled={busy}>
                Add category
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add location</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addLocation} className="space-y-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  items={Object.fromEntries(
                    categories.map((c) => [c.id, c.name] as const)
                  )}
                  value={locationCategoryId}
                  onValueChange={(v) => setLocationCategoryId(v ?? "")}
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
                <Label htmlFor="location">Name</Label>
                <Input
                  id="location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Kruger National Park"
                />
              </div>
              <Button type="submit" disabled={busy || !locationCategoryId}>
                Add location
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Existing</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-6">
                  <div className="font-medium">{c.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {c.locations.length === 0
                      ? "No locations"
                      : c.locations.map((l) => l.name).join(", ")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
