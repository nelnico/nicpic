import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { Gallery } from "@/components/gallery/gallery";
import type { Photo } from "@/types/photo";

export const dynamic = "force-dynamic";

const INITIAL_LIMIT = 30;

function formatMonthYear(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function mapPhoto(p: Awaited<ReturnType<typeof fetchInitial>>["photos"][number]): Photo {
  return {
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
    exposureMode: p.exposureMode ?? "",
    meteringMode: p.meteringMode ?? "",
    flash: p.flash ?? "",
  };
}

async function fetchInitial() {
  const include = {
    category: true,
    location: true,
    tags: { include: { tag: true } },
  } as const;

  const rows = await prisma.photo.findMany({
    where: { NOT: { album: { isPrivate: true } } },
    include,
    orderBy: { position: "desc" },
    take: INITIAL_LIMIT + 1,
  });

  const hasMore    = rows.length > INITIAL_LIMIT;
  const batch      = hasMore ? rows.slice(0, INITIAL_LIMIT) : rows;
  const nextCursor = hasMore ? batch[batch.length - 1].position : null;

  return {
    photos: batch,
    nextCursor,
  };
}

export default async function HomePage() {
  let photos: Photo[] = [];
  let initialNextCursor: number | null = null;

  try {
    const data = await fetchInitial();
    photos = data.photos.map(mapPhoto);
    initialNextCursor = data.nextCursor;
  } catch {
    // leave defaults — empty gallery
  }

  const isAdmin = await verifySession();

  return <Gallery photos={photos} initialNextCursor={initialNextCursor} isAdmin={isAdmin} />;
}
