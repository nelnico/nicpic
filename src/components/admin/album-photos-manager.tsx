"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, XIcon, CheckIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Photo = {
  id: string;
  title: string | null;
  r2Url: string;
  r2ThumbUrl: string | null;
  albumId?: string | null;
  groupId?: string | null;
};

type Group = {
  id: string;
  name: string;
  slug: string;
};

type Album = {
  id: string;
  name: string;
  description: string | null;
};

/** Square thumbnail with a corner action button revealed on hover. */
function PhotoTile({
  photo,
  actionTitle,
  onAction,
}: {
  photo: Photo;
  actionTitle: string;
  onAction: () => void;
}) {
  return (
    <div className="group relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.r2ThumbUrl ?? photo.r2Url}
        alt={photo.title ?? "photo"}
        className="aspect-square w-full rounded-md border border-border object-cover"
      />
      <button
        type="button"
        onClick={onAction}
        title={actionTitle}
        className="absolute right-0.5 top-0.5 hidden rounded bg-background/80 p-0.5 backdrop-blur-sm group-hover:flex"
      >
        <XIcon className="size-3 text-destructive" />
      </button>
      {photo.title && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{photo.title}</p>
      )}
    </div>
  );
}

export function AlbumPhotosManager({
  album,
  initialPhotos,
  initialGroups,
}: {
  album: Album;
  initialPhotos: Photo[];
  initialGroups: Group[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [error, setError] = useState("");

  // Picker target: null = closed, "album" = pull unassigned photos into the
  // album, otherwise the id of the group to move loose album photos into.
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerPhotos, setPickerPhotos] = useState<Photo[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [renaming, setRenaming] = useState<Group | null>(null);

  async function patchPhoto(photoId: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function removeFromAlbum(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    await patchPhoto(photoId, { albumId: null });
  }

  async function removeFromGroup(photoId: string) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, groupId: null } : p))
    );
    await patchPhoto(photoId, { groupId: null });
  }

  async function openPicker(target: string) {
    setSelected(new Set());
    setPickerFor(target);
    setPickerLoading(true);
    try {
      if (target === "album") {
        const res = await fetch("/api/photos?limit=0&noAlbum=true").then((r) => r.json());
        setPickerPhotos(Array.isArray(res) ? res : (res?.photos ?? []));
      } else {
        // Moving within the album — only loose photos are up for grabs.
        setPickerPhotos(photos.filter((p) => !p.groupId));
      }
    } finally {
      setPickerLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmPicker() {
    if (selected.size === 0 || pickerFor === null) return;
    setBusy(true);
    try {
      const chosen = pickerPhotos.filter((p) => selected.has(p.id));
      if (pickerFor === "album") {
        await Promise.all(chosen.map((p) => patchPhoto(p.id, { albumId: album.id })));
        setPhotos((prev) => [...prev, ...chosen.map((p) => ({ ...p, groupId: null }))]);
      } else {
        const groupId = pickerFor;
        await Promise.all(chosen.map((p) => patchPhoto(p.id, { groupId })));
        setPhotos((prev) =>
          prev.map((p) => (selected.has(p.id) ? { ...p, groupId } : p))
        );
      }
      setPickerFor(null);
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: album.id, name: groupName.trim() }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error ?? "Failed to create group.");
      }
      const group: Group = await res.json();
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupName("");
      setNewGroupOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function renameGroup() {
    if (!renaming || !groupName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/groups/${renaming.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error ?? "Failed to rename group.");
      }
      const updated: Group = await res.json();
      setGroups((prev) =>
        prev
          .map((g) => (g.id === updated.id ? updated : g))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setRenaming(null);
      setGroupName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(group: Group) {
    if (!confirm(`Delete group "${group.name}"? Its photos stay in the album, ungrouped.`)) return;
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    setPhotos((prev) =>
      prev.map((p) => (p.groupId === group.id ? { ...p, groupId: null } : p))
    );
    await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });
  }

  const ungrouped = photos.filter((p) => !p.groupId);
  const albumPhotoIds = new Set(photos.map((p) => p.id));
  const available =
    pickerFor === "album"
      ? pickerPhotos.filter((p) => !albumPhotoIds.has(p.id))
      : pickerPhotos;
  const pickerGroupName = groups.find((g) => g.id === pickerFor)?.name ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to admin"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{album.name}</h1>
          {album.description && (
            <p className="text-sm text-muted-foreground">{album.description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setGroupName(""); setError(""); setNewGroupOpen(true); }}
        >
          New group
        </Button>
        <Button size="sm" onClick={() => openPicker("album")}>
          Add photos
        </Button>
      </div>

      {groups.map((group) => {
        const groupPhotos = photos.filter((p) => p.groupId === group.id);
        return (
          <section key={group.id} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-sm font-medium">
                {group.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {groupPhotos.length} photo{groupPhotos.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title="Rename group"
                onClick={() => { setRenaming(group); setGroupName(group.name); setError(""); }}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive hover:text-destructive"
                title="Delete group"
                onClick={() => deleteGroup(group)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                disabled={ungrouped.length === 0}
                onClick={() => openPicker(group.id)}
              >
                Move photos here
              </Button>
            </div>

            {groupPhotos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {ungrouped.length === 0
                  ? "Empty — no ungrouped photos left to move in."
                  : "Empty — use Move photos here."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {groupPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photo={p}
                    actionTitle="Remove from group"
                    onAction={() => removeFromGroup(p.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="space-y-2">
        {groups.length > 0 && (
          <h2 className="text-sm font-medium">
            Ungrouped
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              shown after the group cards on the album page
            </span>
          </h2>
        )}
        {ungrouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {photos.length === 0
              ? "No photos in this album yet."
              : "Every photo in this album is in a group."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {ungrouped.map((p) => (
              <PhotoTile
                key={p.id}
                photo={p}
                actionTitle="Remove from album"
                onAction={() => removeFromAlbum(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create / rename a group */}
      <Dialog
        open={newGroupOpen || renaming !== null}
        onOpenChange={(v) => {
          if (busy || v) return;
          setNewGroupOpen(false);
          setRenaming(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{renaming ? "Rename group" : "New group"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (renaming) renameGroup(); else createGroup(); }}
          >
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Model 1"
              maxLength={60}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setNewGroupOpen(false); setRenaming(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !groupName.trim()}>
                {busy ? "Saving…" : renaming ? "Rename" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo picker — adds to the album, or moves loose photos into a group */}
      <Dialog open={pickerFor !== null} onOpenChange={(v) => { if (!busy && !v) setPickerFor(null); }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pickerFor === "album"
                ? `Add photos to ${album.name}`
                : `Move photos into ${pickerGroupName}`}
            </DialogTitle>
          </DialogHeader>

          {pickerLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pickerFor === "album"
                ? "All photos are already in this album."
                : "No ungrouped photos left to move."}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Click to select.{selected.size > 0 && ` ${selected.size} selected.`}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {available.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className={`relative overflow-hidden rounded-md border-2 transition-colors ${
                        isSelected ? "border-primary" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.r2ThumbUrl ?? p.r2Url}
                        alt={p.title ?? "photo"}
                        className="aspect-square w-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                            <CheckIcon className="size-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button onClick={confirmPicker} disabled={selected.size === 0 || busy}>
                  {busy
                    ? "Saving…"
                    : selected.size > 0
                      ? `${pickerFor === "album" ? "Add" : "Move"} ${selected.size} photo${selected.size !== 1 ? "s" : ""}`
                      : "Select photos"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
