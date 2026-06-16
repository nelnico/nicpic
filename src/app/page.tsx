import { prisma } from "@/lib/prisma";
import { Gallery } from "@/components/Gallery";
import type { Photo } from "@/data/photos";

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
        location: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      // Featured photos pinned to the top, then newest first.
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    const photos: Photo[] = rows.map((p) => ({
      id: p.id,
      src: p.r2Url,
      width: p.width,
      height: p.height,
      title: p.title ?? "Untitled",
      category: p.location.category.name,
      location: p.takenWhere ?? p.location.name,
      date: p.takenAt ? formatMonthYear(p.takenAt) : "",
      tags: p.tags.map((t) => t.tag.name),
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
