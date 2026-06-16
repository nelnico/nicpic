"use client";

import { useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { FilterBar } from "@/components/FilterBar";
import { PhotoCard } from "@/components/PhotoCard";
import { Lightbox } from "@/components/Lightbox";
import type { Category, Photo } from "@/data/photos";

interface GalleryProps {
  photos: Photo[];
  categories: Category[];
}

export function Gallery({ photos, categories }: GalleryProps) {
  const [active, setActive] = useState<Category | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (active === "All" ? photos : photos.filter((p) => p.category === active)),
    [active, photos],
  );

  const selectedIndex = visible.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

  const handleSelect = (photo: Photo) => setSelectedId(photo.id);
  const handleClose = () => setSelectedId(null);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="fixed top-[65px] left-0 right-0 z-20 bg-background/80 backdrop-blur-md pt-2">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <FilterBar
              categories={categories}
              active={active}
              onChange={setActive}
            />
          </div>
        </div>

        <section id="work" className="pt-16 pb-10 md:pt-14">
          {visible.length === 0 ? (
            <div className="mt-10 flex min-h-[40vh] items-center justify-center">
              <p className="eyebrow text-muted-foreground">No photos yet</p>
            </div>
          ) : (
            <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {visible.map((photo, i) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={i}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <Lightbox
          photos={visible}
          index={selectedIndex}
          onClose={handleClose}
          onIndexChange={(i) => setSelectedId(visible[i].id)}
        />
      )}
    </div>
  );
}
