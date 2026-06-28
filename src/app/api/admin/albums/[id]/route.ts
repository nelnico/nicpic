import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

function randomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) code += chars[byte % chars.length];
  return code;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, categoryId, locationId, coverPhotoId, isPrivate, generateCode } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    data.name = name;
    data.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  if (description !== undefined) data.description = description || null;
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (locationId !== undefined) data.locationId = locationId || null;
  if (coverPhotoId !== undefined) data.coverPhotoId = coverPhotoId || null;
  if (isPrivate !== undefined) data.isPrivate = isPrivate;

  if (generateCode) {
    // Create a new independent access code valid for 48h
    await prisma.albumAccessCode.create({
      data: {
        albumId: id,
        code: randomCode(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
  }

  try {
    const updated = await prisma.album.update({
      where: { id },
      data,
      include: {
        category: true,
        location: true,
        coverPhoto: { select: { r2ThumbUrl: true, r2Url: true } },
        accessCodes: { orderBy: { createdAt: "desc" } },
        _count: { select: { photos: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Album PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.album.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
