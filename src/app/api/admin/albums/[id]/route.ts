import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, description, locationId, coverPhotoId } = await request.json();

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    data.name = name;
    data.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  if (description !== undefined) data.description = description || null;
  if (locationId !== undefined) data.locationId = locationId || null;
  if (coverPhotoId !== undefined) data.coverPhotoId = coverPhotoId || null;

  const album = await prisma.album.update({
    where: { id },
    data,
    include: {
      location: true,
      coverPhoto: { select: { r2ThumbUrl: true, r2Url: true } },
      _count: { select: { photos: true } },
    },
  });
  return NextResponse.json(album);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // Detach photos before deleting (albumId → null via onDelete:SetNull handled by DB)
  await prisma.album.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
