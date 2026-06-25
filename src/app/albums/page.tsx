import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AlbumsPage() {
  const albums = await prisma.album.findMany({
    include: {
      location: true,
      photos: {
        take: 4,
        orderBy: { position: "desc" },
        select: { id: true, r2ThumbUrl: true, r2Url: true },
      },
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
            const photos = album.photos;
            return (
              <Link
                key={album.id}
                href={`/albums/${album.slug}`}
                className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/30"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {photos.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No photos
                    </div>
                  ) : photos.length === 1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[0].r2ThumbUrl ?? photos[0].r2Url}
                      alt={album.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
                      {[0, 1, 2, 3].map((i) =>
                        photos[i] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={photos[i].id}
                            src={photos[i].r2ThumbUrl ?? photos[i].r2Url}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div key={i} className="bg-muted" />
                        )
                      )}
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
