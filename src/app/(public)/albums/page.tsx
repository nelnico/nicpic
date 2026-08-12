import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { AlbumsPage } from "@/components/gallery/albums-page";

export const dynamic = "force-dynamic";

export default async function AlbumsPageRoute() {
  const [isAdmin, jar, albums, catRows] = await Promise.all([
    verifySession(),
    cookies(),
    prisma.album.findMany({
      include: {
        category: true,
        location: true,
        photos: {
          take: 4,
          orderBy: [{ sortDate: "desc" }, { id: "desc" }],
          select: { id: true, r2ThumbUrl: true, r2Url: true },
        },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { albums: { some: {} } },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // For each private album, check if the visitor already has a valid access cookie
  const privateAlbums = albums.filter((a) => a.isPrivate);
  const unlockedIds = new Set<string>();

  if (privateAlbums.length > 0) {
    await Promise.all(
      privateAlbums.map(async (album) => {
        const cookieCode = jar.get(`alb_${album.id}`)?.value;
        if (!cookieCode) return;
        const valid = await prisma.albumAccessCode.findFirst({
          where: { albumId: album.id, code: cookieCode, expiresAt: { gt: new Date() } },
          select: { id: true },
        });
        if (valid) unlockedIds.add(album.id);
      })
    );
  }

  const categories = catRows.map((c) => c.name);

  return (
    <AlbumsPage
      albums={albums}
      categories={categories}
      isAdmin={isAdmin}
      unlockedAlbumIds={[...unlockedIds]}
    />
  );
}
