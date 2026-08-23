import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { slugify } from "@/lib/slugify";

export async function POST(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { albumId, name } = await request.json();
  if (!albumId || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "albumId and name are required" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
  }

  const clash = await prisma.photoGroup.findFirst({ where: { albumId, slug } });
  if (clash) {
    return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
  }

  const group = await prisma.photoGroup.create({
    data: { albumId, name: name.trim(), slug },
    include: { photos: { select: { id: true } } },
  });
  return NextResponse.json(group, { status: 201 });
}
