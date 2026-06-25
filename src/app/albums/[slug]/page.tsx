import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Gallery } from "@/components/gallery/gallery";
import { Nav } from "@/components/gallery/nav";
import type { Photo } from "@/types/photo";

function formatMonthYear(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

const include = {
  category: true,
  location: true,
  tags: { include: { tag: true } },
} as const;

type DbPhoto = Awaited<ReturnType<typeof prisma.photo.findMany<{ include: typeof include }>>>[number];

function mapPhoto(p: DbPhoto): Photo {
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

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const album = await prisma.album.findUnique({
    where: { slug },
    include: { location: true },
  });
  if (!album) notFound();

  const photos = await prisma.photo.findMany({
    where: { albumId: album.id },
    include,
    orderBy: { position: "desc" },
  });

  const categories = [...new Set(photos.map((p) => p.category.name))].sort();

  return (
    <main>
      <Nav />

      <div className="mx-auto max-w-[1600px] px-6 pt-8 pb-2 md:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">{album.name}</h1>
        {album.location && (
          <p className="mt-1 text-sm text-muted-foreground">{album.location.name}</p>
        )}
        {album.description && (
          <p className="mt-2 text-sm text-muted-foreground">{album.description}</p>
        )}
      </div>

      <Gallery
        photos={photos.map(mapPhoto)}
        categories={categories}
        initialNextCursor={null}
        albumMode
        hideNav
      />
    </main>
  );
}
