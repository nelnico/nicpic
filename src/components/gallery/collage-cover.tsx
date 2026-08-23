type CoverPhoto = { id: string; r2ThumbUrl: string | null; r2Url: string };

/**
 * Square cover built from up to 4 photos — a 2×2 collage when there are enough,
 * a single image otherwise. Shared by album cards and group cards so the two
 * read as the same kind of thing.
 */
export function CollageCover({
  photos,
  alt,
  emptyLabel = "No photos",
}: {
  photos: CoverPhoto[];
  alt: string;
  emptyLabel?: string;
}) {
  const usable = photos.filter((p) => p.r2ThumbUrl || p.r2Url);

  const inner =
    usable.length === 0 ? (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    ) : usable.length < 4 ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={usable[0].r2ThumbUrl ?? usable[0].r2Url}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ) : (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
        {usable.slice(0, 4).map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.r2ThumbUrl ?? p.r2Url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ))}
      </div>
    );

  return <div className="aspect-square w-full overflow-hidden bg-muted">{inner}</div>;
}
