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

type Item = { id: string; name: string; _count: { photos: number } };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Item[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [c, l] = await Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/locations").then((r) => r.json()),
    ]);
    setCategories(Array.isArray(c) ? c : []);
    setLocations(Array.isArray(l) ? l : []);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load data."));
  }, []);

  async function add(kind: "categories" | "locations", name: string) {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await fetch(`/api/admin/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (kind === "categories") setNewCategory("");
      else setNewLocation("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: "categories" | "locations", item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/${kind}/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        return;
      }
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

      <p className="mb-6 text-sm text-muted-foreground">
        Categories and locations are independent — a photo always has a category,
        and can optionally have a location. The same location can be used across
        any category.
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <ManageList
          title="Categories"
          placeholder="e.g. People"
          items={categories}
          value={newCategory}
          onValue={setNewCategory}
          onAdd={() => add("categories", newCategory)}
          onRemove={(item) => remove("categories", item)}
          busy={busy}
        />
        <ManageList
          title="Locations"
          placeholder="e.g. Cape Town"
          items={locations}
          value={newLocation}
          onValue={setNewLocation}
          onAdd={() => add("locations", newLocation)}
          onRemove={(item) => remove("locations", item)}
          busy={busy}
        />
      </div>
    </div>
  );
}

function ManageList({
  title,
  placeholder,
  items,
  value,
  onValue,
  onAdd,
  onRemove,
  busy,
}: {
  title: string;
  placeholder: string;
  items: Item[];
  value: string;
  onValue: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: Item) => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
          className="space-y-2"
        >
          <Label className="sr-only">Add {title}</Label>
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => onValue(e.target.value)}
              placeholder={placeholder}
            />
            <Button type="submit" disabled={busy}>
              Add
            </Button>
          </div>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    ({item._count.photos})
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(item)}
                  className="text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
