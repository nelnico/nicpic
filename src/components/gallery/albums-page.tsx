"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/gallery/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AlbumPhoto = { id: string; r2ThumbUrl: string | null; r2Url: string };
type Album = {
  id: string;
  name: string;
  slug: string;
  isPrivate: boolean;
  location: { name: string } | null;
  category: { name: string } | null;
  photos: AlbumPhoto[];
  _count: { photos: number };
};

interface AlbumsPageProps {
  albums: Album[];
  categories: string[];
  isAdmin?: boolean;
}

function AlbumCover({ album, isAdmin }: { album: Album; isAdmin?: boolean }) {
  const photos = album.photos;
  const inner =
    photos.length === 0 ? (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No photos
      </div>
    ) : album._count.photos < 5 ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photos[0].r2ThumbUrl ?? photos[0].r2Url}
        alt={album.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ) : (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
        {[0, 1, 2, 3].map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photos[i].id}
            src={photos[i].r2ThumbUrl ?? photos[i].r2Url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ))}
      </div>
    );

  if (album.isPrivate && !isAdmin) {
    return (
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <div style={{ filter: "blur(2px)" }}>{inner}</div>
      </div>
    );
  }

  return (
    <div className="aspect-square w-full overflow-hidden bg-muted">{inner}</div>
  );
}

function CodePromptDialog({
  album,
  open,
  onOpenChange,
}: {
  album: Album | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) { setCode(""); setError(""); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!album) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/albums/${album.slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid or expired code.");
        return;
      }
      onOpenChange(false);
      router.push(`/albums/${album.slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Private album</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{album?.name}</span> is private.
          Enter the access code you were given to view it.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            className="font-mono tracking-widest text-center text-lg uppercase"
            autoFocus
            maxLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || code.trim().length === 0}>
              {busy ? "Checking…" : "Unlock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AlbumsPage({ albums, categories, isAdmin }: AlbumsPageProps) {
  const [active, setActive] = useState<string | "All">("All");
  const [promptAlbum, setPromptAlbum] = useState<Album | null>(null);

  const visible =
    active === "All"
      ? albums
      : albums.filter((a) => a.category?.name === active);

  return (
    <main className="mx-auto max-w-[1600px] px-6 pt-4 pb-10 md:px-10">
      {categories.length > 0 && (
        <div className="sticky top-[var(--nav-height,56px)] z-10 bg-background">
          <FilterBar
            categories={categories}
            active={active}
            onChange={setActive}
          />
        </div>
      )}

      <div className="pt-6">
        {visible.length === 0 ? (
          <p className="text-muted-foreground">No albums yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((album) => {
              const card = (
                <div className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30">
                  <AlbumCover album={album} isAdmin={isAdmin} />
                  <div className="p-3">
                    <p className="font-medium leading-tight">{album.name}</p>
                    {album.location && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{album.location.name}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{album._count.photos} photos</p>
                  </div>
                </div>
              );

              if (album.isPrivate && !isAdmin) {
                return (
                  <button
                    key={album.id}
                    className="text-left"
                    onClick={() => setPromptAlbum(album)}
                  >
                    {card}
                  </button>
                );
              }

              return (
                <Link key={album.id} href={`/albums/${album.slug}`}>
                  {card}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CodePromptDialog
        album={promptAlbum}
        open={promptAlbum !== null}
        onOpenChange={(v) => { if (!v) setPromptAlbum(null); }}
      />
    </main>
  );
}
