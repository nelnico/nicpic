import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

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
    focalLength35mm,
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
    featured,
    tags,
  } = body;

  // Fetch the uploaded original from R2 and generate a WebP thumbnail.
  let r2ThumbUrl: string | null = null;
  let resolvedThumbKey: string | null = null;

  try {
    const imageRes = await fetch(r2Url as string);
    if (!imageRes.ok) throw new Error(`R2 fetch returned ${imageRes.status}`);

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const thumbBuffer = await sharp(imageBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: thumbKey as string,
        Body: thumbBuffer,
        ContentType: "image/webp",
      })
    );

    r2ThumbUrl = `${R2_PUBLIC_URL}/${thumbKey}`;
    resolvedThumbKey = thumbKey as string;
  } catch (err) {
    console.error("[photos] thumbnail generation failed:", err);
  }

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
      focalLength35mm: focalLength35mm || null,
      exposureMode: exposureMode || null,
      meteringMode: meteringMode || null,
      flash: flash || null,
      takenAt: takenAt ? new Date(takenAt) : null,
      takenWhere,
      r2Key,
      r2Url,
      r2ThumbKey: resolvedThumbKey,
      r2ThumbUrl: r2ThumbUrl,
      width,
      height,
      featured: featured ?? false,
      tags: {
        create: tagConnections,
      },
    },
  });

  return NextResponse.json(photo);
}
