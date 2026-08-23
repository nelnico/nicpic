import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the current window expires. */
  retryAfter: number;
};

/**
 * Fixed-window rate limiter backed by Postgres, so it survives the multiple
 * short-lived instances a serverless deploy spreads requests across.
 *
 * The upsert is a single atomic statement: concurrent requests either start a
 * fresh window or increment the existing one, never both.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);

  const [row] = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${windowEnd} ELSE "RateLimit"."expiresAt" END
    RETURNING "count", "expiresAt"
  `;

  const retryAfter = Math.max(
    1,
    Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000)
  );
  return { ok: row.count <= limit, retryAfter };
}

/** Best-effort client IP, trusting the proxy headers Vercel sets. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
