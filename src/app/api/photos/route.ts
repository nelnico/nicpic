import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;

// Cursor encodes the last-seen (sortDate, id) pair so pagination stays stable
// even when many photos share the same taken date.
function parseCursor(raw: string | null): { sortDate: Date; id: string } | null {
  if (!raw) return null;
  const sep = raw.lastIndexOf("_");
  if (sep === -1) return null;
  const date = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(date.getTime()) || !id) return null;
  return { sortDate: date, id };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryName = searchParams.get("category");
  const locationSlug = searchParams.get("location");
  const tag          = searchParams.get("tag");
  const noAlbum      = searchParams.get("noAlbum") === "true";
  const q            = searchParams.get("q");
  const cursorParam  = searchParams.get("cursor");
  const limitParam   = searchParams.get("limit");

  const cursor = parseCursor(cursorParam);
  const limit  = limitParam === "0" ? 0 : Math.min(parseInt(limitParam ?? String(DEFAULT_LIMIT)), 100);

  // Each word must match at least one field (category, location, tag, title,
  // description, or free-text "taken where"); words are ANDed together so
  // e.g. "ocean seagull" finds photos tagged "seagull" in the "ocean" category.
  const words = q ? q.trim().split(/\s+/).filter(Boolean) : [];

  const conditions: Prisma.PhotoWhereInput[] = [
    // never expose photos from private albums on the public gallery
    { NOT: { album: { isPrivate: true } } },
  ];
  if (cursor) {
    conditions.push({
      OR: [
        { sortDate: { lt: cursor.sortDate } },
        { sortDate: cursor.sortDate, id: { lt: cursor.id } },
      ],
    });
  }
  if (categoryName) conditions.push({ category: { name: categoryName } });
  if (locationSlug) conditions.push({ location: { slug: locationSlug } });
  if (tag) conditions.push({ tags: { some: { tag: { slug: tag } } } });
  if (noAlbum) conditions.push({ albumId: null });
  if (words.length > 0) {
    conditions.push({
      AND: words.map((word) => ({
        OR: [
          { title: { contains: word, mode: "insensitive" as const } },
          { description: { contains: word, mode: "insensitive" as const } },
          { takenWhere: { contains: word, mode: "insensitive" as const } },
          { category: { name: { contains: word, mode: "insensitive" as const } } },
          { location: { name: { contains: word, mode: "insensitive" as const } } },
          { tags: { some: { tag: { name: { contains: word, mode: "insensitive" as const } } } } },
        ],
      })),
    });
  }

  const rows = await prisma.photo.findMany({
    where: { AND: conditions },
    include: {
      category: true,
      location: true,
      tags: { include: { tag: true } },
    },
    orderBy: [{ sortDate: "desc" }, { id: "desc" }],
    ...(limit > 0 && { take: limit + 1 }),
  });

  const hasMore = limit > 0 && rows.length > limit;
  const photos  = hasMore ? rows.slice(0, limit) : rows;
  const last    = photos[photos.length - 1];
  const nextCursor = hasMore && last ? `${last.sortDate.toISOString()}_${last.id}` : null;

  return NextResponse.json({ photos, nextCursor });
}
