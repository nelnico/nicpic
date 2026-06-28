import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryName = searchParams.get("category");
  const locationSlug = searchParams.get("location");
  const tag          = searchParams.get("tag");
  const noAlbum      = searchParams.get("noAlbum") === "true";
  const cursorParam  = searchParams.get("cursor");
  const limitParam   = searchParams.get("limit");

  const cursor = cursorParam ? parseInt(cursorParam) : null;
  const limit  = limitParam === "0" ? 0 : Math.min(parseInt(limitParam ?? String(DEFAULT_LIMIT)), 100);

  const rows = await prisma.photo.findMany({
    where: {
      ...(cursor        && { position: { lt: cursor } }),
      ...(categoryName  && { category: { name: categoryName } }),
      ...(locationSlug  && { location: { slug: locationSlug } }),
      ...(tag           && { tags: { some: { tag: { slug: tag } } } }),
      ...(noAlbum       && { albumId: null }),
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
