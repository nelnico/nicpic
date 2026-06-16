import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categorySlug = searchParams.get("category");
  const locationSlug = searchParams.get("location");
  const tag = searchParams.get("tag");
  const featuredOnly = searchParams.get("featured") === "true";

  const photos = await prisma.photo.findMany({
    where: {
      ...(featuredOnly && { featured: true }),
      ...(categorySlug && {
        location: { category: { slug: categorySlug } },
      }),
      ...(locationSlug && {
        location: { slug: locationSlug },
      }),
      ...(tag && {
        tags: { some: { tag: { slug: tag } } },
      }),
    },
    include: {
      location: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    // Featured photos pinned to the top, then newest first.
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(photos);
}
