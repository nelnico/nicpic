import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
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

  // Gate private albums behind a valid access code cookie
  if (album.isPrivate) {
    const jar = await cookies();
    const cookieCode = jar.get(`alb_${album.id}`)?.value;

    const valid = cookieCode
      ? await prisma.albumAccessCode.findFirst({
          where: {
            albumId: album.id,
            code: cookieCode,
            expiresAt: { gt: new Date() },
          },
        })
      : null;

    if (!valid) {
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
  }

  const [photos, isAdmin] = await Promise.all([
    prisma.photo.findMany({
      where: { albumId: album.id },
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

      <Gallery
        photos={photos.map(mapPhoto)}
        initialNextCursor={null}
        albumMode
        isAdmin={isAdmin}
      />
    </main>
  );
}
