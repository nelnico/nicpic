import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { canViewAlbum } from "@/lib/album-access";
import { Gallery } from "@/components/gallery/gallery";
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

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string; groupSlug: string }>;
}) {
  const { slug, groupSlug } = await params;

  const album = await prisma.album.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, isPrivate: true },
  });
  if (!album) notFound();

  const group = await prisma.photoGroup.findFirst({
    where: { albumId: album.id, slug: groupSlug },
    select: { id: true, name: true },
  });
  if (!group) notFound();

  const breadcrumb = (
    <p className="text-sm text-muted-foreground">
      <Link href="/albums" className="hover:text-foreground transition-colors">Albums</Link>
      <span className="mx-1.5">›</span>
      <Link href={`/albums/${album.slug}`} className="hover:text-foreground transition-colors">
        {album.name}
      </Link>
      <span className="mx-1.5">›</span>
      {group.name}
    </p>
  );

  // A group is only as private as the album holding it.
  if (!(await canViewAlbum(album))) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pt-4 pb-10 md:px-10">
        {breadcrumb}
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

  const [photos, isAdmin] = await Promise.all([
    prisma.photo.findMany({
      where: { groupId: group.id },
      include,
      orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    }),
    verifySession(),
  ]);

  return (
    <main>
      <div className="mx-auto max-w-[1600px] px-6 pt-4 pb-3 md:px-10">{breadcrumb}</div>

      {photos.length === 0 ? (
        <div className="mx-auto max-w-[1600px] px-6 pb-10 md:px-10">
          <p className="text-sm text-muted-foreground">No photos in this group yet.</p>
        </div>
      ) : (
        <Gallery
          photos={photos.map(mapPhoto)}
          initialNextCursor={null}
          albumMode
          isAdmin={isAdmin}
        />
      )}
    </main>
  );
}
