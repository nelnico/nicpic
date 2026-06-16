import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const lenses = await prisma.lens.findMany({
    include: { _count: { select: { photos: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(lenses);
}

export async function POST(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await request.json();
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const lens = await prisma.lens.create({ data: { name, slug } });
  return NextResponse.json(lens);
}
