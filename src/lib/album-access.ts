import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Whether the current visitor may view a private album's contents.
 *
 * The cookie stores the access code itself, and it is re-checked against the DB
 * on every request — so revoking a code locks its holder out on their next page
 * load rather than whenever the cookie happens to expire.
 */
export async function canViewAlbum(album: {
  id: string;
  isPrivate: boolean;
}): Promise<boolean> {
  if (!album.isPrivate) return true;

  const jar = await cookies();
  const cookieCode = jar.get(`alb_${album.id}`)?.value;
  if (!cookieCode) return false;

  const valid = await prisma.albumAccessCode.findFirst({
    where: { albumId: album.id, code: cookieCode, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return valid !== null;
}
