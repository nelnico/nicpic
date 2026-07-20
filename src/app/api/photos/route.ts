import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryName = searchParams.get("category");
  const locationSlug = searchParams.get("location");
  const tag          = searchParams.get("tag");
  const noAlbum      = searchParams.get("noAlbum") === "true";
  const q            = searchParams.get("q");
  const cursorParam  = searchParams.get("cursor");
  const limitParam   = searchParams.get("limit");

  const cursor = cursorParam ? parseInt(cursorParam) : null;
  const limit  = limitParam === "0" ? 0 : Math.min(parseInt(limitParam ?? String(DEFAULT_LIMIT)), 100);

  // Each word must match at least one field (category, location, tag, title,
  // description, or free-text "taken where"); words are ANDed together so
  // e.g. "ocean seagull" finds photos tagged "seagull" in the "ocean" category.
  const words = q ? q.trim().split(/\s+/).filter(Boolean) : [];

  const rows = await prisma.photo.findMany({
    where: {
      ...(cursor        && { position: { lt: cursor } }),
      ...(categoryName  && { category: { name: categoryName } }),
      ...(locationSlug  && { location: { slug: locationSlug } }),
      ...(tag           && { tags: { some: { tag: { slug: tag } } } }),
      ...(noAlbum       && { albumId: null }),
      ...(words.length > 0 && {
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
      }),
      // never expose photos from private albums on the public gallery
      NOT: { album: { isPrivate: true } },
    },
    include: {
      category: true,
      location: true,
      tags: { include: { tag: true } },
    },
    orderBy: { position: "desc" },
    ...(limit > 0 && { take: limit + 1 }),
  });

  const hasMore   = limit > 0 && rows.length > limit;
  const photos    = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? photos[photos.length - 1].position : null;

  return NextResponse.json({ photos, nextCursor });
}
