import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const albums = await prisma.album.findMany({
    include: {
      location: true,
      coverPhoto: { select: { r2ThumbUrl: true, r2Url: true } },
      _count: { select: { photos: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(albums);
}

export async function POST(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, locationId } = await request.json();
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const album = await prisma.album.create({
    data: { name, slug, description: description || null, locationId: locationId || null },
    include: { location: true, _count: { select: { photos: true } } },
  });
  return NextResponse.json(album);
}
