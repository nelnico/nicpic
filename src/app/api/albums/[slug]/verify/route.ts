import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { code } = await request.json();

  // Throttle before touching the code so a script can't grind through guesses.
  const limit = await rateLimit(
    `album-verify:${slug}:${clientIp(request)}`,
    MAX_ATTEMPTS,
    WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const album = await prisma.album.findUnique({
    where: { slug },
    select: { id: true, isPrivate: true },
  });

  if (!album?.isPrivate) {
    return NextResponse.json({ error: "Not a private album" }, { status: 400 });
  }

  const match = await prisma.albumAccessCode.findFirst({
    where: {
      albumId: album.id,
      code: code?.toString().toUpperCase(),
      expiresAt: { gt: new Date() },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  const maxAge = Math.floor((match.expiresAt.getTime() - Date.now()) / 1000);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`alb_${album.id}`, match.code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
  return response;
}
