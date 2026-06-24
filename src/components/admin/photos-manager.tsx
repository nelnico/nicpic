"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoDialog, type EditablePhoto } from "@/components/admin/photo-dialog";

type Opt = { id: string; name: string };

type ApiPhoto = {
  id: string;
  title: string | null;
  description: string | null;
  r2Url: string;
  r2ThumbUrl: string | null;
  position: number;
  categoryId: string;
  locationId: string | null;
  takenAt: string | null;
  takenWhere: string | null;
  tags: { tag: { name: string } }[];
};

function toEditable(p: ApiPhoto): EditablePhoto {
  return {
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    categoryId: p.categoryId,
    locationId: p.locationId ?? "none",
    takenAt: p.takenAt ? p.takenAt.slice(0, 10) : "",
    takenWhere: p.takenWhere ?? "",
    tags: p.tags.map((t) => t.tag.name),
    r2Url: p.r2Url,
  };
}

function SortablePhoto({
  photo,
  onEdit,
}: {
  photo: ApiPhoto;
  onEdit: (p: ApiPhoto) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute right-0.5 top-0.5 z-10 cursor-grab rounded bg-background/70 p-0.5 backdrop-blur-sm active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={() => onEdit(photo)}
        className="block w-full overflow-hidden rounded-md border border-border"
        title="Edit"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.r2ThumbUrl ?? photo.r2Url}
          alt={photo.title ?? "photo"}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>

      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {photo.title || "Untitled"}
      </p>
    </div>
  );
}

export function PhotosManager() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [locations, setLocations] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePhoto | null>(null);
  const [createKey, setCreateKey] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function loadPhotos() {
    const data = await fetch("/api/photos").then((r) => r.json());
    setPhotos(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    const get = (k: string, set: (v: Opt[]) => void) =>
      fetch(`/api/admin/${k}`)
        .then((r) => r.json())
        .then((d) => set(Array.isArray(d) ? d : []))
        .catch(() => set([]));
    get("categories", setCategories);
    get("locations", setLocations);
    loadPhotos()
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setCreateKey((k) => k + 1);
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ApiPhoto) {
    setEditing(toEditable(p));
    setDialogOpen(true);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);

    try {
      const res = await fetch("/api/admin/photos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      await loadPhotos();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photos</CardTitle>
        <CardAction>
          <Button size="sm" onClick={openCreate}>
            Upload
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No photos yet — hit <strong>Upload</strong> to add one.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={photos.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {photos.map((p) => (
                  <SortablePhoto
                    key={p.id}
                    photo={p}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <PhotoDialog
        key={editing?.id ?? createKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        photo={editing}
        categories={categories}
        locations={locations}
        onSaved={loadPhotos}
      />
    </Card>
  );
}
