import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlbumPhotosManager } from "@/components/admin/album-photos-manager";

export default async function AlbumAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [album, photos, groups] = await Promise.all([
    prisma.album.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    }),
    prisma.photo.findMany({
      where: { albumId: id },
      select: { id: true, title: true, r2Url: true, r2ThumbUrl: true, groupId: true },
      orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    }),
    prisma.photoGroup.findMany({
      where: { albumId: id },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!album) notFound();

  return (
    <AlbumPhotosManager album={album} initialPhotos={photos} initialGroups={groups} />
  );
}
