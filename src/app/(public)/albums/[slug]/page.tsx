import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { canViewAlbum } from "@/lib/album-access";
import { Gallery } from "@/components/gallery/gallery";
import { CollageCover } from "@/components/gallery/collage-cover";
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
    category: p.category.name,
    location: p.location?.name ?? "",
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

  if (!(await canViewAlbum(album))) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pt-4 pb-10 md:px-10">
        <p className="text-sm text-muted-foreground">
          <Link href="/albums" className="hover:text-foreground transition-colors">Albums</Link>
          <span className="mx-1.5">›</span>
          {album.name}
        </p>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-lg font-medium">This album is private</p>
          <p className="text-sm text-muted-foreground">
            Go back to albums and enter your access code to view it.
          </p>
          <Link
            href="/albums"
            className="mt-2 text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground transition-colors"
          >
            Back to albums
          </Link>
        </div>
      </main>
    );
  }

  const [groups, photos, isAdmin] = await Promise.all([
    prisma.photoGroup.findMany({
      where: { albumId: album.id },
      include: {
        photos: {
          take: 4,
          orderBy: [{ sortDate: "desc" }, { id: "desc" }],
          select: { id: true, r2ThumbUrl: true, r2Url: true },
        },
        _count: { select: { photos: true } },
      },
      orderBy: { name: "asc" },
    }),
    // Only the loose photos — anything in a group is reached through its card.
    prisma.photo.findMany({
      where: { albumId: album.id, groupId: null },
      include,
      orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    }),
    verifySession(),
  ]);

  return (
    <main>
      <div className="mx-auto max-w-[1600px] px-6 pt-4 pb-3 md:px-10">
        <p className="text-sm text-muted-foreground">
          <Link href="/albums" className="hover:text-foreground transition-colors">Albums</Link>
          <span className="mx-1.5">›</span>
          {album.name}
        </p>
      </div>

      {groups.length > 0 && (
        <div className="mx-auto max-w-[1600px] px-6 pb-2 md:px-10">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/albums/${album.slug}/${group.slug}`}>
                <div className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30">
                  <CollageCover photos={group.photos} alt={group.name} />
                  <div className="p-3">
                    <p className="font-medium leading-tight">{group.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group._count.photos} photos
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {photos.length > 0 && <div className="mt-8 border-t border-border" />}
        </div>
      )}

      {photos.length > 0 ? (
        <Gallery
          photos={photos.map(mapPhoto)}
          initialNextCursor={null}
          albumMode
          isAdmin={isAdmin}
        />
      ) : (
        groups.length === 0 && (
          <div className="mx-auto max-w-[1600px] px-6 pb-10 md:px-10">
            <p className="text-sm text-muted-foreground">No photos in this album yet.</p>
          </div>
        )
      )}
    </main>
  );
}
