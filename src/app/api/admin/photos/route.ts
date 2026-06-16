import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

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
    cameraId,
    lensId,
    iso,
    aperture,
    shutterSpeed,
    takenAt,
    takenWhere,
    r2Key,
    r2Url,
    width,
    height,
    featured,
    tags,
  } = body;

  // Upsert tags and connect them
  const tagConnections = await Promise.all(
    (tags as string[]).map(async (tagName: string) => {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-");
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name: tagName, slug },
      });
      return { tagId: tag.id };
    })
  );

  const photo = await prisma.photo.create({
    data: {
      title,
      description,
      categoryId,
      locationId: locationId || null,
      cameraId: cameraId || null,
      lensId: lensId || null,
      iso: iso || null,
      aperture: aperture || null,
      shutterSpeed: shutterSpeed || null,
      takenAt: takenAt ? new Date(takenAt) : null,
      takenWhere,
      r2Key,
      r2Url,
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
