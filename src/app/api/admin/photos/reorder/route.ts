import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  // ids[0] = displayed first → gets the highest position value (since we ORDER BY position DESC)
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.photo.update({
        where: { id },
        data: { position: ids.length - i },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
