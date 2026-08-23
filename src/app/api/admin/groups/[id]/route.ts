import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { slugify } from "@/lib/slugify";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.photoGroup.findUnique({
    where: { id },
    select: { albumId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
  }

  const clash = await prisma.photoGroup.findFirst({
    where: { albumId: existing.albumId, slug, NOT: { id } },
  });
  if (clash) {
    return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
  }

  const group = await prisma.photoGroup.update({
    where: { id },
    data: { name: name.trim(), slug },
  });
  return NextResponse.json(group);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Photos fall back to ungrouped rather than being deleted (groupId is SetNull).
  const { id } = await params;
  await prisma.photoGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
