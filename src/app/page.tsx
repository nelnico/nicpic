import { prisma } from "@/lib/prisma";
import { Gallery } from "@/components/gallery/gallery";
import type { Photo } from "@/types/photo";

export const dynamic = "force-dynamic";

function formatMonthYear(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function getGalleryData(): Promise<{
  photos: Photo[];
  categories: string[];
}> {
  try {
    const rows = await prisma.photo.findMany({
      include: {
        category: true,
        location: true,
        tags: { include: { tag: true } },
      },
      orderBy: { position: "desc" },
    });

    const photos: Photo[] = rows.map((p) => ({
      id: p.id,
      src: p.r2Url,
      thumbnail: p.r2ThumbUrl ?? p.r2Url,
      width: p.width,
      height: p.height,
      title: p.title ?? "",
      description: p.description ?? "",
      category: p.category.name,
      location: p.location?.name ?? "",
      where: p.takenWhere ?? "",
      date: p.takenAt ? formatMonthYear(p.takenAt) : "",
      tags: p.tags.map((t) => t.tag.name),
      cameraMake: p.cameraMake ?? "",
      cameraModel: p.cameraModel ?? "",
      iso: p.iso ?? "",
      aperture: p.aperture ?? "",
      shutterSpeed: p.shutterSpeed ?? "",
      focalLength: p.focalLength ?? "",
      focalLength35mm: p.focalLength35mm ?? "",
      exposureMode: p.exposureMode ?? "",
      meteringMode: p.meteringMode ?? "",
      flash: p.flash ?? "",
    }));

    const categories = [...new Set(photos.map((p) => p.category))].sort();

    return { photos, categories };
  } catch {
    // DB not reachable yet (e.g. before Neon is configured) — render empty.
    return { photos: [], categories: [] };
  }
}

export default async function HomePage() {
  const { photos, categories } = await getGalleryData();
  return <Gallery photos={photos} categories={categories} />;
}
