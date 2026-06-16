import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhotoEditForm } from "@/components/PhotoEditForm";

export const dynamic = "force-dynamic";

export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [photo, categories, locations] = await Promise.all([
    prisma.photo.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!photo) notFound();

  return (
    <PhotoEditForm
      photo={{
        id: photo.id,
        title: photo.title ?? "",
        description: photo.description ?? "",
        categoryId: photo.categoryId,
        locationId: photo.locationId ?? "none",
        takenAt: photo.takenAt ? photo.takenAt.toISOString().slice(0, 10) : "",
        takenWhere: photo.takenWhere ?? "",
        featured: photo.featured,
        tags: photo.tags.map((t) => t.tag.name),
        r2Url: photo.r2Url,
      }}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}
