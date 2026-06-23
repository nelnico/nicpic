import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from R2
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: photo.r2Key }));

  // Delete from DB
  await prisma.photo.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// Partial update — handles both the simple featured toggle and full metadata edits.
// Only fields present in the body are changed.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const data: Prisma.PhotoUncheckedUpdateInput = {};
  if ("title" in body) data.title = body.title || null;
  if ("description" in body) data.description = body.description || null;
  if ("categoryId" in body) data.categoryId = body.categoryId;
  if ("locationId" in body) data.locationId = body.locationId || null;
  if ("cameraId" in body) data.cameraId = body.cameraId || null;
  if ("lensId" in body) data.lensId = body.lensId || null;
  if ("iso" in body) data.iso = body.iso || null;
  if ("aperture" in body) data.aperture = body.aperture || null;
  if ("shutterSpeed" in body) data.shutterSpeed = body.shutterSpeed || null;
  if ("focalLength" in body) data.focalLength = body.focalLength || null;
  if ("focalLength35mm" in body) data.focalLength35mm = body.focalLength35mm || null;
  if ("exposureMode" in body) data.exposureMode = body.exposureMode || null;
  if ("meteringMode" in body) data.meteringMode = body.meteringMode || null;
  if ("flash" in body) data.flash = body.flash || null;
  if ("gpsLat" in body) data.gpsLat = body.gpsLat ?? null;
  if ("gpsLng" in body) data.gpsLng = body.gpsLng ?? null;
  if ("gpsAlt" in body) data.gpsAlt = body.gpsAlt ?? null;
  if ("takenAt" in body) data.takenAt = body.takenAt ? new Date(body.takenAt) : null;
  if ("takenWhere" in body) data.takenWhere = body.takenWhere || null;
  if ("featured" in body) data.featured = body.featured;

  // Replace tags only when an array is provided.
  if (Array.isArray(body.tags)) {
    const tagConnections = await Promise.all(
      (body.tags as string[]).map(async (tagName) => {
        const slug = tagName.toLowerCase().replace(/\s+/g, "-");
        const tag = await prisma.tag.upsert({
          where: { slug },
          update: {},
          create: { name: tagName, slug },
        });
        return { tagId: tag.id };
      })
    );
    data.tags = { deleteMany: {}, create: tagConnections };
  }

  const photo = await prisma.photo.update({ where: { id }, data });
  return NextResponse.json(photo);
}
