import type { Photo } from "@/types/photo";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onSelect: (photo: Photo) => void;
}

export function PhotoCard({ photo, index, onSelect }: PhotoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(photo)}
      style={{ animationDelay: `${Math.min(index * 55, 500)}ms` }}
      className="reveal-up group mb-5 block w-full cursor-pointer overflow-hidden text-left"
    >
      <div className="relative overflow-hidden bg-card">
        {/* Plain <img> as designed by Lovable; width/height present so there's no CLS. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.title}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="block w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/0 to-background/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="eyebrow text-muted-foreground">
            {photo.category}
            {photo.location ? ` — ${photo.location}` : ""}
          </p>
          <h3 className="mt-1 font-serif text-2xl leading-tight">{photo.title}</h3>
        </div>
      </div>
    </button>
  );
}
