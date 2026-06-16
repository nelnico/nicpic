# Build Progress — Nico's Photo Portfolio

> **Purpose:** single source of truth for where this build is, so work can resume after any restart.
> **Last updated:** 2026-06-16

---

## ⏸ Where we are right now (resume here)

**Done:** App fully built (admin + public Lovable gallery), **building green**, **Neon DB +
Cloudflare R2 live and verified**. **Data model was changed** (2026-06-16): Category and
Location are now **independent** — a Photo has a **required category** + an **optional
location** (a location can be reused across categories). Admin now supports **add + delete**
for both. The DB was **reset to empty**.

**▶ MUST DO FIRST: restart `npm run dev`.** The schema changed and the Prisma client was
regenerated, so a running dev server is stale.

**Then:**
1. `/admin/login` (password `your-admin-password`) → `/admin/categories`: create your
   categories (e.g. People, Landscape, Wildlife) and any locations (e.g. Cape Town, Kruger).
2. `/admin/upload`: pick a category (required), optionally a location, choose an image, upload.
3. Confirm it shows on `/`.
4. Then → deployment (Phase 13, Vercel).

**Reminders:**
- Admin password is `your-admin-password` (in `.env.local`) — change anytime.
- Schema was applied via `prisma db push` (not a tracked migration) — see migration note below.
- R2 CORS currently allows only localhost; add the production origin when deploying.

---

## How to resume after a restart

1. Read this file top to bottom.
2. Run `npm install` (if `node_modules` is missing) then `npm run build` — it should pass clean.
3. Check **Outstanding inputs** and **Next step** below to see what to do next.
4. Background context also lives in Claude memory (`photo-portfolio-build`, `prisma7-stack-adaptations`).

---

## Stack (as actually installed)

| Concern | Choice | Installed version |
|---|---|---|
| Framework | Next.js 16 App Router + TS | next 16.2.9, react 19.2.4 |
| Styling | Tailwind v4 + shadcn/ui (style `base-nova` on **Base UI**, neutral, CSS vars) | tailwind v4 |
| ORM | Prisma 7 + PostgreSQL | prisma 7.8.0 |
| DB runtime driver | `@prisma/adapter-pg` + `pg` (Prisma 7 driver adapter) | adapter-pg 7.8.0 |
| Photo storage | Cloudflare R2 via AWS S3 SDK v3 | @aws-sdk/client-s3 |
| Auth | Hardcoded password → signed JWT cookie (`jose`) via `src/proxy.ts` | jose 6 |
| Hosting | Vercel | — |

---

## Phase status

| Phase | What | Status |
|---|---|---|
| 1 | Scaffold + deps + shadcn | ✅ Done |
| 2 | Prisma schema + migration | ✅ Done — migrated to Neon, write/read smoke-tested |
| 3 | R2 client (`src/lib/r2.ts`) | ✅ Done — creds live, pipeline verified |
| 4 | Auth lib + route protection (`src/proxy.ts`) | ✅ Done |
| 5 | Admin login page + API | ✅ Done |
| 6 | Presign + save APIs + upload form | ✅ Done |
| 7 | Categories + locations APIs (+ `/admin/categories` page) | ✅ Done |
| 8 | Public gallery (Lovable design) — homepage `/` | ✅ Done |
| 9 | Public components (Nav, FilterBar, PhotoCard, Lightbox, Gallery) | ✅ Done |
| 10 | Admin dashboard, manage-photos, delete/patch API | ✅ Done |
| 11 | Next config (R2 images) | ✅ Done |
| 12 | R2 bucket/token setup (manual in Cloudflare) | ✅ Done — bucket `nicpic`, r2.dev URL, CORS, token |
| 13 | Vercel deploy + domain | ⏳ **Next** |

`npm run build` currently passes, and the homepage was smoke-tested (renders the nav + empty-gallery state; dark theme + fonts compile correctly).

### Design note — Lovable vs. the original doc's routes
Lovable designed a **single-page filterable gallery** with an in-page **lightbox** (swipe + ←/→ + Esc), not the doc's separate `/gallery`, `/gallery/[category]`, `/gallery/[category]/[location]`, `/photo/[id]` routes. Per the doc, Lovable is the source of truth for the public UI, so the homepage `/` *is* the gallery. The DB still has the full category→location→photo hierarchy; only the **category** level is surfaced as filter tabs right now. Location-level browsing and per-photo URLs from the doc are **not** part of the Lovable design — can be added later if wanted. Adaptations made: Base UI `Dialog` (no `asChild`), real data mapped into Lovable's `Photo` shape, two corrupted lines in the paste fixed, lightbox corner shows a 2-digit index instead of the DB cuid. Public images use Lovable's plain `<img>` (has width/height, so no CLS) rather than `next/image`.

---

## Files created so far

```
src/
├─ proxy.ts                                  # admin route protection (Next 16 "proxy")
├─ lib/
│  ├─ prisma.ts                              # Prisma 7 client via pg driver adapter
│  ├─ r2.ts                                  # S3 client pointed at R2
│  ├─ auth.ts                                # JWT session cookie helpers
│  └─ utils.ts                               # shadcn cn()
├─ components/
│  ├─ ui/                                    # shadcn: button,input,label,card,badge,select,textarea,checkbox,dialog
│  ├─ Nav.tsx  FilterBar.tsx  PhotoCard.tsx  Lightbox.tsx  Gallery.tsx   # Lovable public UI
├─ data/photos.ts                           # public Photo type (Lovable shape)
└─ app/
   ├─ page.tsx                               # homepage = Lovable gallery, wired to DB
   ├─ layout.tsx                             # Inter / Instrument Serif / JetBrains Mono fonts
   ├─ globals.css                            # Lovable dark editorial theme (Tailwind v4)
   ├─ admin/
   │  ├─ page.tsx                            # dashboard + stats
   │  ├─ login/page.tsx
   │  ├─ upload/page.tsx                     # full upload flow
   │  ├─ photos/page.tsx                     # manage / delete / feature
   │  └─ categories/page.tsx                 # create categories & locations
   └─ api/
      ├─ photos/route.ts                     # public photos (filter by category/location/tag/featured)
      └─ admin/{login,presign,categories,locations,photos,photos/[id]}/route.ts
prisma/schema.prisma                         # Category, Location, Photo, Tag, PhotoTag
prisma.config.ts                             # loads .env.local; datasource url for CLI
next.config.ts                               # R2 remote image hostname (from R2_PUBLIC_URL)
.env.local                                   # all secrets (gitignored)
```

---

## Key deviations from the original build doc (intentional, version-driven)

The doc predates these tool versions. These changes were required:

1. **Prisma 7 — no `url` in schema.** Connection URL lives in `prisma.config.ts`; runtime uses a **driver adapter** (`@prisma/adapter-pg`). `src/lib/prisma.ts` does `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Imports still come from `@prisma/client`.
2. **All env in `.env.local`.** `prisma.config.ts` calls `dotenv config({ path: ".env.local" })` so the Prisma CLI reads the same file the app uses.
3. **Next.js 16 — `middleware` → `proxy`.** File is `src/proxy.ts`, exports `proxy()` (same matcher/behavior). The old `middleware` name is deprecated.
4. **shadcn `base-nova` runs on Base UI.** `Select.onValueChange` gives `string | null`, so handlers coerce with `(v) => setX(v ?? "")`.
5. **`next.config.ts`** derives the R2 image hostname from `R2_PUBLIC_URL` instead of hardcoding. `reactCompiler: true` (enabled by scaffold) kept.
6. **`postinstall: prisma generate`** added for Vercel.
7. **Data model decoupled (2026-06-16):** Category & Location are independent; `Photo.categoryId` required, `Photo.locationId` optional (`onDelete: SetNull`). Applied with **`prisma db push --accept-data-loss`**, NOT `prisma migrate` (migrate is interactive and this shell is non-interactive). ⚠️ **Migration drift:** `prisma/migrations/` still only has the old `init`; the live DB is ahead of it. Deploy is unaffected (same shared Neon DB; build doesn't run migrations). **Before any future `prisma migrate dev`, baseline the migrations** (data is disposable, so a reset is fine) or it'll complain about drift.

---

## Branding / cloning

All site branding is centralised in **`src/config/site.ts`** (`siteConfig`: `name`,
`eyebrow`, `title`, `description`), consumed by `layout.tsx` (metadata), `Nav.tsx`, and
`AdminHeader.tsx`. To rebrand: edit that file, **or** set `NEXT_PUBLIC_SITE_*` env vars
(commented examples in `.env.local`) for a no-code, per-deployment override when cloning.
These are build-time inlined → restart `npm run dev` / redeploy after changing them.
Future option for non-technical owners: a DB settings table + admin Settings page.

## Accounts

| Account | Needed for | Status |
|---|---|---|
| Neon (Postgres) | Phase 2 migration + runtime DB | ✅ Done — `eu-central-1`, migrated |
| Cloudflare R2 | Photo storage (Phases 3/12) | ✅ Done — bucket `nicpic`, r2.dev public URL |
| Vercel | Deploy (Phase 13) | ⏳ **Next** |

### `.env.local` status
- `ADMIN_COOKIE_SECRET` — ✅ generated
- `ADMIN_PASSWORD` — ✅ set (currently `your-admin-password` — change anytime)
- `DATABASE_URL` — ✅ Neon **direct** endpoint (no `-pooler`, no `channel_binding`); real secret lives only here, `.env` holds a placeholder
- `R2_*` — ✅ all set (account id, access key, secret, bucket `nicpic`, r2.dev public URL); pipeline verified

**Seed data:** one Category **Wildlife** + Location **Kruger National Park** were created during the DB smoke test (visible in `/admin/categories`). There's no category/location *delete* UI yet — manage via Prisma Studio if you want them gone.

---

## 👉 Next step

**1. Verify a real upload in the browser** (everything's wired; this is the final functional check):
   - Restart `npm run dev` (old server has stale env), open `/admin/login`, then `/admin/upload`.
   - Upload an image under Wildlife → Kruger; confirm it appears on `/`.

**2. Deploy to Vercel (Phase 13):**
   - `vercel` (or connect the repo in the Vercel dashboard).
   - Add **all** `.env.local` vars in Vercel → Project → Settings → Environment Variables.
   - After deploy, add the live site origin to the **R2 CORS** allowlist (currently localhost only).
   - Domain: point Afrihost DNS at Vercel (Phase 30). Optionally add an R2 custom photo domain.

Note: R2 is set up with the **r2.dev** public URL (fine for now; rate-limited, not ideal for
heavy production). A custom photo domain can be added later via Cloudflare.

---

## ⏳ Backlog / open decisions

- [x] Lovable export integrated; admin password set; **Neon DB + Cloudflare R2 configured & verified**.
- **Featured = pin-to-top** (decided): featured photos sort first in the gallery, everything still shows. Implemented via `orderBy: [{ featured: "desc" }, { createdAt: "desc" }]` in `src/app/page.tsx` + `src/app/api/photos/route.ts`. (Homepage shows ALL photos, not just featured.)
- [ ] **Infinite scroll** — planned for when the library grows. Today the homepage loads all photos at once (images already lazy-load). Add a cursor-paginated `/api/photos` + load-more-on-scroll in `Gallery.tsx`. ~30–45 min.
- [ ] **Deploy (Phase 13):** push to Vercel, copy all `.env.local` vars into Vercel, add the live origin to R2 CORS, point Afrihost DNS at Vercel; optional R2 custom photo domain.
- [ ] Optional: the doc's extra public routes (location browsing, per-photo URLs) — not part of Lovable's single-page design.
