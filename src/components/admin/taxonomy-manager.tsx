"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Item = { id: string; name: string; _count: { photos: number } };

export function TaxonomyManager({
  title,
  noun,
  kind,
  placeholder,
}: {
  title: string;
  noun: string;
  kind: "categories" | "locations";
  placeholder: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const data = await fetch(`/api/admin/${kind}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditing(null);
    setName("");
    setError("");
    setOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setName(item.name);
    setError("");
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        editing ? `/api/admin/${kind}/${editing.id}` : `/api/admin/${kind}`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        return;
      }
      setOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/${kind}/${editing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        return;
      }
      setOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardAction>
          <Button size="sm" variant="outline" onClick={openAdd}>
            Add
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="text-sm text-left hover:underline underline-offset-2"
                >
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    ({item._count.photos})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${noun}` : `Add ${noun}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${kind}-name`}>Name</Label>
              <Input
                id={`${kind}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between">
              <div>
                {editing && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={remove}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {editing ? "Save" : "Add"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
