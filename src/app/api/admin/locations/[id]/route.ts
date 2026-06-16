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
  const { name } = await request.json();
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const location = await prisma.location.update({
    where: { id },
    data: { name, slug },
  });
  return NextResponse.json(location);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Location is optional on a photo; deleting it just clears it (onDelete: SetNull).
  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
