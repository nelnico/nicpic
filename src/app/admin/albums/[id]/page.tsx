import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlbumPhotosManager } from "@/components/admin/album-photos-manager";

export default async function AlbumAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [album, photos] = await Promise.all([
    prisma.album.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    }),
    prisma.photo.findMany({
      where: { albumId: id },
      select: { id: true, title: true, r2Url: true, r2ThumbUrl: true },
      orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    }),
  ]);

  if (!album) notFound();

  return <AlbumPhotosManager album={album} initialPhotos={photos} />;
}
