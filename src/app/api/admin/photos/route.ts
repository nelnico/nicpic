import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { processAndStoreImage } from "@/lib/photo-processing";
import { computeSortDate } from "@/lib/photo-sort-date";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    categoryId,
    locationId,
    cameraMake,
    cameraModel,
    iso,
    aperture,
    shutterSpeed,
    focalLength,
    exposureMode,
    meteringMode,
    flash,
    takenAt,
    takenWhere,
    r2Key,
    r2Url,
    thumbKey,
    width,
    height,
    tags,
    albumId,
  } = body;

  // Fetch the uploaded original from R2, resize it, and generate a thumbnail.
  const { r2ThumbUrl, resolvedThumbKey, processedWidth, processedHeight } =
    await processAndStoreImage({
      r2Key: r2Key as string,
      r2Url: r2Url as string,
      thumbKey: thumbKey as string,
      width: width as number,
      height: height as number,
    });

  // Upsert tags and connect them (sequential to avoid race on unique name constraint)
  const uniqueTagNames = [...new Set((tags as string[]).map((t) => t.trim()).filter(Boolean))];
  const tagConnections: { tagId: string }[] = [];
  for (const tagName of uniqueTagNames) {
    const slug = tagName.toLowerCase().replace(/\s+/g, "-");
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name: tagName, slug },
    });
    tagConnections.push({ tagId: tag.id });
  }

  const takenAtDate = takenAt ? new Date(takenAt) : null;
  const uploadedAt = new Date();

  const photo = await prisma.photo.create({
    data: {
      title,
      description,
      categoryId,
      locationId: locationId || null,
      cameraMake: cameraMake || null,
      cameraModel: cameraModel || null,
      iso: iso || null,
      aperture: aperture || null,
      shutterSpeed: shutterSpeed || null,
      focalLength: focalLength || null,
      exposureMode: exposureMode || null,
      meteringMode: meteringMode || null,
      flash: flash || null,
      takenAt: takenAtDate,
      takenWhere,
      r2Key,
      r2Url,
      r2ThumbKey: resolvedThumbKey,
      r2ThumbUrl: r2ThumbUrl,
      width:  processedWidth,
      height: processedHeight,
      sortDate: computeSortDate(takenAtDate, uploadedAt),
      createdAt: uploadedAt,
      albumId: albumId || null,
      tags: {
        create: tagConnections,
      },
    },
  });

  return NextResponse.json(photo);
}
