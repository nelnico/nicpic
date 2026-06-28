import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { AlbumsPage } from "@/components/gallery/albums-page";

export const dynamic = "force-dynamic";

export default async function AlbumsPageRoute() {
  const isAdmin = await verifySession();

  const [albums, catRows] = await Promise.all([
    prisma.album.findMany({
      include: {
        category: true,
        location: true,
        photos: {
          take: 4,
          orderBy: { position: "desc" },
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

  const categories = catRows.map((c) => c.name);

  return <AlbumsPage albums={albums} categories={categories} isAdmin={isAdmin} />;
}
