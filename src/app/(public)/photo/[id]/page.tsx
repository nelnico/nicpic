import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { Gallery } from "@/components/gallery/gallery";
import type { Photo } from "@/types/photo";

export const dynamic = "force-dynamic";

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

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { ...include, album: { select: { id: true, slug: true, isPrivate: true } } },
  });
  if (!photo) notFound();

  // Gate photos that live in a private album behind a valid access code cookie
  if (photo.album?.isPrivate) {
    const jar = await cookies();
    const cookieCode = jar.get(`alb_${photo.album.id}`)?.value;

    const valid = cookieCode
      ? await prisma.albumAccessCode.findFirst({
          where: {
            albumId: photo.album.id,
            code: cookieCode,
            expiresAt: { gt: new Date() },
          },
        })
      : null;

    if (!valid) {
      return (
        <main className="mx-auto max-w-[1600px] px-6 pt-4 pb-10 md:px-10">
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🔒</span>
            <p className="text-lg font-medium">This photo is in a private album</p>
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
        where: { albumId: photo.album.id },
        include,
        orderBy: [{ sortDate: "desc" }, { id: "desc" }],
      }),
      verifySession(),
    ]);

    return (
      <Gallery
        photos={photos.map(mapPhoto)}
        initialNextCursor={null}
        albumMode
        initialSelectedId={id}
        isAdmin={isAdmin}
      />
    );
  }

  // Public photo: load it in place within the home listing so the grid and
  // infinite scroll continue exactly as if it had been reached by scrolling.
  // "At or before this photo" / "strictly after it" mirror the [sortDate desc, id desc]
  // ordering used everywhere else (see /api/photos), so the cursor can pick up seamlessly.
  const atOrBeforePhoto = {
    OR: [
      { sortDate: { gt: photo.sortDate } },
      { sortDate: photo.sortDate, id: { gte: photo.id } },
    ],
  };
  const strictlyAfterPhoto = {
    OR: [
      { sortDate: { lt: photo.sortDate } },
      { sortDate: photo.sortDate, id: { lt: photo.id } },
    ],
  };

  const [rows, hasMoreBelow, isAdmin] = await Promise.all([
    prisma.photo.findMany({
      where: { AND: [{ NOT: { album: { isPrivate: true } } }, atOrBeforePhoto] },
      include,
      orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    }),
    prisma.photo.count({
      where: { AND: [{ NOT: { album: { isPrivate: true } } }, strictlyAfterPhoto] },
    }),
    verifySession(),
  ]);

  return (
    <Gallery
      photos={rows.map(mapPhoto)}
      initialNextCursor={hasMoreBelow > 0 ? `${photo.sortDate.toISOString()}_${photo.id}` : null}
      initialSelectedId={id}
      isAdmin={isAdmin}
    />
  );
}
