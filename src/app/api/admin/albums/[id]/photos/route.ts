import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photos = await prisma.photo.findMany({
    where: { albumId: id },
    include: { category: true, location: true },
    orderBy: [{ sortDate: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(photos);
}
