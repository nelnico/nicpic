import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  const locations = await prisma.location.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, categoryId } = await request.json();
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const location = await prisma.location.create({
    data: { name, slug, categoryId },
  });
  return NextResponse.json(location);
}
