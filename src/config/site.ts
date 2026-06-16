// Central site configuration — the one place to rebrand the site.
//
// Edit the defaults here, OR (handy when cloning this for someone else)
// override any value per-deployment with the matching NEXT_PUBLIC_* env var
// in .env.local / Vercel, with no code changes. NEXT_PUBLIC_ is required so
// the values are available in client components (the nav, admin header) too.
const name = process.env.NEXT_PUBLIC_SITE_NAME ?? "nicpic";

export const siteConfig = {
  /** Brand name shown in the public nav and admin header. */
  name,
  /** Small tag shown next to the name in the nav (e.g. a country code). */
  eyebrow: process.env.NEXT_PUBLIC_SITE_EYEBROW ?? "ZA",
  /** Browser tab title / default <title>. */
  title: process.env.NEXT_PUBLIC_SITE_TITLE ?? `${name} — Photography`,
  /** <meta name="description">. */
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "Photography portfolio.",
} as const;
