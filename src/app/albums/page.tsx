import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AlbumsPage() {
  const albums = await prisma.album.findMany({
    include: {
      location: true,
      coverPhoto: { select: { r2ThumbUrl: true, r2Url: true } },
      _count: { select: { photos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Albums</h1>

      {albums.length === 0 ? (
        <p className="text-muted-foreground">No albums yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {albums.map((album) => {
            const thumb = album.coverPhoto?.r2ThumbUrl ?? album.coverPhoto?.r2Url;
            return (
              <Link
                key={album.id}
                href={`/albums/${album.slug}`}
                className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={album.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                      No cover
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium leading-tight">{album.name}</p>
                  {album.location && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{album.location.name}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{album._count.photos} photos</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
