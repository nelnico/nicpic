import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";
import { processAndStoreImage } from "@/lib/photo-processing";

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

  // Delete from R2 (original + thumbnail)
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: photo.r2Key }));
  if (photo.r2ThumbKey) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: photo.r2ThumbKey }));
  }

  // Delete from DB
  await prisma.photo.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// Partial update — only fields present in the body are changed.
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
  if ("cameraMake" in body) data.cameraMake = body.cameraMake || null;
  if ("cameraModel" in body) data.cameraModel = body.cameraModel || null;
  if ("iso" in body) data.iso = body.iso || null;
  if ("aperture" in body) data.aperture = body.aperture || null;
  if ("shutterSpeed" in body) data.shutterSpeed = body.shutterSpeed || null;
  if ("focalLength" in body) data.focalLength = body.focalLength || null;
  if ("exposureMode" in body) data.exposureMode = body.exposureMode || null;
  if ("meteringMode" in body) data.meteringMode = body.meteringMode || null;
  if ("flash" in body) data.flash = body.flash || null;
  if ("takenAt" in body) data.takenAt = body.takenAt ? new Date(body.takenAt) : null;
  if ("takenWhere" in body) data.takenWhere = body.takenWhere || null;
  if ("albumId" in body) data.albumId = body.albumId || null;

  // Replace tags only when an array is provided.
  if (Array.isArray(body.tags)) {
    const uniqueNames = [...new Set((body.tags as string[]).map((t) => t.trim()).filter(Boolean))];
    const tagConnections: { tagId: string }[] = [];
    for (const tagName of uniqueNames) {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-");
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name: tagName, slug },
      });
      tagConnections.push({ tagId: tag.id });
    }
    data.tags = { deleteMany: {}, create: tagConnections };
  }

  // Replace the underlying image file: the client already uploaded the new
  // original to R2 (via /api/admin/presign); process it, point the record at
  // the new files, and only then delete the old ones.
  let oldR2Key: string | null = null;
  let oldR2ThumbKey: string | null = null;
  if (body.r2Key && body.r2Url && body.thumbKey) {
    const existing = await prisma.photo.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    oldR2Key = existing.r2Key;
    oldR2ThumbKey = existing.r2ThumbKey;

    const { r2ThumbUrl, resolvedThumbKey, processedWidth, processedHeight } =
      await processAndStoreImage({
        r2Key: body.r2Key,
        r2Url: body.r2Url,
        thumbKey: body.thumbKey,
        width: body.width,
        height: body.height,
      });

    data.r2Key = body.r2Key;
    data.r2Url = body.r2Url;
    data.r2ThumbKey = resolvedThumbKey;
    data.r2ThumbUrl = r2ThumbUrl;
    data.width = processedWidth;
    data.height = processedHeight;
  }

  const photo = await prisma.photo.update({ where: { id }, data });

  if (oldR2Key) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldR2Key }));
    if (oldR2ThumbKey) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldR2ThumbKey }));
    }
  }

  return NextResponse.json(photo);
}
