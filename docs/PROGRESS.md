# Build Progress — Nico's Photo Portfolio

> **Purpose:** single source of truth for where this build is, so work can resume after any restart.
> **Last updated:** 2026-08-12 (description/takenWhere fields removed, lint clean, build green)

---

## ⏸ Where we are right now (resume here)

**App is live on Vercel. Build is green. All core features done.**

The gallery is a fully functional photo portfolio with:
- **Public gallery** — CSS Grid masonry, sortDate ordering, infinite scroll (30/page, cursor-based), category filter tabs, lightbox with swipe + pinch-to-zoom + EXIF panel.
- **Admin** — thumbnail grid (order follows sortDate, no manual reordering), upload/edit dialog, category/location/tag management.
- **Storage** — Cloudflare R2 (upload via presigned URL, thumbnails generated server-side with jimp).
- **DB** — Neon Postgres via Prisma 7 + `@prisma/adapter-pg`.

**To resume dev:** `npm run dev` — no stale env issues, no migrations pending. Lint is clean (`npm run lint` passes with 0 errors).

---

## How to resume after a restart

1. Read this file top to bottom.
2. `npm install` (if `node_modules` missing) then `npm run build` — should pass clean.
3. Check **Next step** and **Backlog** below.
4. Background context in Claude memory: `photo-portfolio-build`, `prisma7-stack-adaptations`.

---

## Stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js 16 App Router + TS | next 16.x, react 19.x |
| Styling | Tailwind v4 + shadcn/ui (base-nova on Base UI) | tailwind v4 |
| ORM | Prisma 7 + PostgreSQL | prisma 7.8.0 |
| DB driver | `@prisma/adapter-pg` + `pg` | adapter-pg 7.8.0 |
| Image processing | jimp (pure JS — sharp fails on Vercel serverless) | jimp 1.x |
| Photo storage | Cloudflare R2 via AWS S3 SDK v3 | @aws-sdk/client-s3 |
| Auth | Hardcoded password → signed JWT cookie (`jose`) via `src/proxy.ts` | jose 6 |
| Hosting | Vercel | live |

---

## Phase status

| Phase | What | Status |
|---|---|---|
| 1 | Scaffold + deps + shadcn | ✅ Done |
| 2 | Prisma schema + migration | ✅ Done — Neon, write/read smoke-tested |
| 3 | R2 client (`src/lib/r2.ts`) | ✅ Done |
| 4 | Auth lib + route protection (`src/proxy.ts`) | ✅ Done |
| 5 | Admin login page + API | ✅ Done |
| 6 | Presign + save APIs + upload form | ✅ Done |
| 7 | Categories + locations APIs | ✅ Done |
| 8–9 | Public gallery + components | ✅ Done |
| 10 | Admin dashboard, manage-photos, delete/patch API | ✅ Done |
| 11–12 | Next config + R2 bucket/CORS setup | ✅ Done |
| 13 | Vercel deploy + domain | ✅ Live |

---

## Key features implemented

### Photo ordering — automatic by date (replaced manual position)
- `Photo.position Int` column removed; replaced with `Photo.sortDate DateTime`.
- `sortDate` = `takenAt` when known, else `createdAt` (upload time) — computed via `computeSortDate()` in `src/lib/photo-sort-date.ts`, kept in sync on create/update.
- Gallery orders by `sortDate DESC` (indexed).
- Existing rows backfilled once via `scripts/backfill-positions.mjs` when the `position` column shipped; now superseded by `scripts/backfill-sort-date.mjs` (ran once, sets `sortDate = COALESCE(takenAt, createdAt)`).
- **Schema applied via `prisma db push` (not migrate)** due to pre-existing drift. See migration note below.
- **Admin drag-and-drop reorder removed** — no more manual ordering. `PATCH /api/admin/photos/reorder` and dnd-kit deleted; admin thumbnail grid (`grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8`) is now a plain read-only grid, ordered by `sortDate` like the public gallery.

### Upload photo dialog enhancements
- **+ buttons on selects**: Category, Location, and Album selects each have a small `+` button that opens a quick-add dialog. Validates (not empty, not duplicate), saves to API, auto-selects the new item.
- **Date picker**: `When taken` field replaced with a Base UI Popover + react-day-picker calendar (`src/components/ui/date-picker.tsx`). Stores as `YYYY-MM-DD` string, same as before.
- `react-day-picker` added as a dependency.

### Replace photo file (admin edit)
- Edit dialog now has an optional "Replace image" file input — uploading a new file there swaps the underlying photo entirely (original, thumbnail, dimensions, EXIF), keeping all other metadata (title, category, tags, etc.) as edited.
- Shared resize/thumbnail logic extracted into `src/lib/photo-processing.ts` (`processAndStoreImage`), used by both `POST /api/admin/photos` (new upload) and `PATCH /api/admin/photos/[id]` (replace).
- `PATCH` order of operations: upload new file to R2 (client, via presign) → process + point DB record at new `r2Key`/`r2ThumbKey` → only then delete the old R2 objects. Avoids ever leaving the record pointing at a missing file if a step fails.

### Admin album photo management
- `/admin/albums/[id]` — server-rendered page showing all photos in an album as a thumbnail grid.
- Hover a photo → X button removes it from the album (`PATCH albumId: null`).
- **Add photos** button opens a modal fetching only unassigned photos (`/api/photos?limit=0&noAlbum=true`). Multi-select with checkmark overlay, batch-assigns on confirm.
- `AlbumsManager` each album row has a **Photos** link navigating to this page.
- `noAlbum=true` query param added to `/api/photos` — adds `WHERE albumId IS NULL` at DB level.

### UX polish
- Categories/Locations: clicking the name opens the edit dialog (no separate Edit button).
- Albums: same — click name to edit; location removed from the row display.
- Library grid: `lg:grid-cols-3` fills full width with 3 panels.
- `cursor: pointer` added globally in `globals.css` for all `button`, `a`, and `[role="button"]` elements.

### Albums
- `Album` model: name, slug, description, locationId (optional), coverPhotoId (unused in UI — collage used instead), createdAt, updatedAt.
- `Photo.albumId` optional FK → Album (onDelete: SetNull).
- Admin: Albums card in Library section — create/edit/delete. Upload dialog shows optional album picker when albums exist.
- Public: `/albums` listing (album cards with 2×2 photo collage if 5+ photos, single photo if fewer), `/albums/[slug]` detail page with full masonry gallery + lightbox.
- Nav lives in `app/(public)/layout.tsx` — shared across all public pages. Admin has its own layout.
- `focalLength35mm` removed from schema, API, dialog, types, gallery, lightbox.

### Album categories
- `Album.categoryId` optional FK → `Category` (onDelete: SetNull).
- `Category` model now has `albums Album[]` relation.
- `/albums` page shows category filter tabs (same pattern as home page photo categories). Client-side filtering — no server round-trip needed since album list is small.
- Create/edit album dialog has category + location selects with `+` quick-add buttons (same pattern as photo upload dialog).

### Private albums with access codes
- `Album.isPrivate Boolean @default(false)` — mark any album as private from admin dialog.
- `AlbumAccessCode` model: `id, albumId, code (6-char), expiresAt (48h from creation), createdAt`. Multiple independent codes per album — each is valid for 48h from when it was generated.
- Admin: checkbox in album dialog; when checked, shows active access codes list (code + "expires in X hours" + Revoke button) and a Generate Code button. Revoke calls `DELETE /api/admin/album-codes/[id]`.
- `PATCH /api/admin/albums/[id]` with `{ generateCode: true }` creates a new `AlbumAccessCode` record.
- Public `/albums`: locked private album cards show a plain lock placeholder — **no imagery**. The server (`src/app/(public)/albums/page.tsx`) strips `photos` to `[]` for any private album the visitor hasn't unlocked, so the R2 URLs never reach the client. (Previously the real thumbnails were sent and only CSS-blurred, which meant anyone could read them out of the page source.) Clicking opens a code-entry dialog inline. Entering a valid code calls `POST /api/albums/[slug]/verify`, which validates against DB and sets httpOnly cookie `alb_{albumId}` = the code (maxAge = seconds until code expiry).
- Public `/albums/[slug]`: server component reads `alb_{albumId}` cookie, validates against `AlbumAccessCode` in DB (code match + not expired). Invalid → shows locked UI with link back to /albums. Valid → renders gallery normally.
- **Private album photos excluded from home page**: `src/app/(public)/page.tsx` and `src/app/api/photos/route.ts` both filter `NOT: { album: { isPrivate: true } }`. Categories with only private-album photos also disappear from the home page filter tabs.
- **Unlock persists until code expires**: `/albums` server page checks each private album's cookie on load. If valid, the album renders its real cover and links directly — no code re-entry. Cookie maxAge matches code expiry (up to 48h). Admin always sees all albums unlocked.
- **Brute-force throttle**: `POST /api/albums/[slug]/verify` is rate limited to **5 attempts per IP per album per 15 min**, then returns `429` with a `Retry-After` header. Backed by the `RateLimit` table (`key, count, expiresAt`) via `src/lib/rate-limit.ts` — Postgres rather than in-memory, because Vercel spreads requests across short-lived instances. The upsert is one atomic `INSERT … ON CONFLICT … RETURNING`, so concurrent requests can't race the counter. Known limit: per-IP only, so a distributed/botnet attack isn't covered.
- R2 object keys are UUIDs (`photos/<uuid>.<ext>`), so public bucket URLs are unguessable — they're effectively secret links. That only holds as long as nothing leaks them, which is why the cover placeholder above matters.
- **Album collage robustness**: cover photos filtered to only those with valid URLs; grid rendered from `photos.length` not `_count.photos` to prevent blank cells from broken/missing images.

### Featured flag — removed
- Removed from schema, API, admin UI, and photo dialog.

### Description / takenWhere fields — removed
- `Photo.description` and `Photo.takenWhere` dropped from schema, both API routes, admin `photo-dialog.tsx` (Description textarea + "Where taken" input gone) and `photos-manager.tsx`, `types/photo.ts`, gallery/lightbox rendering, and all three public page mappers (`page.tsx`, `albums/[slug]/page.tsx`, `photo/[id]/page.tsx`). Search matching in `/api/photos` now covers title/category/location/tag only.
- Applied via `prisma db push --accept-data-loss` — 11 photos had a non-null `takenWhere` value at drop time; that data is gone.

### Public gallery
- **CSS Grid masonry**: `gridAutoRows: 4px`, `gap: 12px`, span computed via `ResizeObserver` on the `<img>` element (`contentRect.height`). Observing the image (not the button) fixes stale spans on column-count breakpoint crossings.
- **Infinite scroll**: cursor-based (`sortDate DESC`), 30 photos/page, `IntersectionObserver` sentinel with `rootMargin: 300px`. `isFirstRender` ref skips mount fetch (SSR data already loaded).
- **Category filter**: re-fetches from server on change (complete filtered view, not client-side slice).
- **Filter bar**: `sticky` (not `fixed`) so it shares the same horizontal reference as the nav and content — fixes left-edge misalignment caused by `scrollbar-gutter: stable both-edges` applying differently to fixed vs flow elements.

### Lightbox
- Swipe navigation (pointer events, 18% threshold).
- **Continuous pinch-to-zoom** (1×–5×): native non-passive touch listeners, refs mirror state to avoid stale closures, zoom-toward-pinch-centre math. Double-tap toggles 1×/2×.
- EXIF panel (slide up from bottom).

### Image processing
- **jimp** replaces sharp (sharp fails with `ERR_DLOPEN_FAILED` on Vercel serverless — no native deps).
- Thumbnails generated on upload, stored in R2 alongside originals.

---

## Files (current structure)

```
src/
├─ proxy.ts                          # admin route protection (Next 16 "proxy")
├─ lib/
│  ├─ prisma.ts                      # Prisma 7 client via pg driver adapter
│  ├─ r2.ts                          # S3 client → R2
│  ├─ photo-processing.ts            # resize + thumbnail via jimp, shared by upload + replace
│  ├─ auth.ts                        # JWT session cookie helpers
│  ├─ rate-limit.ts                  # Postgres fixed-window throttle (access-code attempts)
│  └─ utils.ts                       # shadcn cn()
├─ config/site.ts                    # all branding (name, eyebrow, title, description)
├─ types/photo.ts                    # Photo + Category types (public shape)
├─ components/
│  ├─ ui/                            # shadcn components (incl. date-picker.tsx)
│  ├─ gallery/
│  │  ├─ gallery.tsx                 # main gallery (infinite scroll, filter, lightbox wiring)
│  │  ├─ nav.tsx                     # sticky top nav
│  │  ├─ filter-bar.tsx              # sticky category tabs
│  │  ├─ photo-card.tsx              # masonry card (ResizeObserver span)
│  │  ├─ lightbox.tsx                # full-screen lightbox + pinch zoom
│  │  └─ content-guard.tsx           # (layout-level)
│  └─ admin/
│     ├─ photos-manager.tsx          # thumbnail grid, ordered by sortDate (read-only)
│     ├─ photo-dialog.tsx            # upload + edit dialog (+ quick-add dialogs, date picker)
│     ├─ album-photos-manager.tsx    # per-album photo grid (remove + add)
│     ├─ albums-manager.tsx          # albums CRUD card + Photos link per album
│     └─ taxonomy-manager.tsx        # categories / locations CRUD
└─ app/
   ├─ layout.tsx                     # fonts + global metadata
   ├─ globals.css                    # dark editorial theme (Tailwind v4)
   ├─ (public)/
   │  ├─ layout.tsx                  # shared Nav for all public pages
   │  ├─ page.tsx                    # homepage — SSR first 30 photos + categories
   │  └─ albums/
   │     ├─ page.tsx                 # album listing with photo collage cards
   │     └─ [slug]/page.tsx          # album detail — masonry gallery + lightbox
   ├─ admin/
   │  ├─ layout.tsx                  # AdminHeader wrapper
   │  ├─ page.tsx                    # admin dashboard
   │  ├─ login/page.tsx
   │  └─ albums/[id]/page.tsx        # per-album photo management (server component)
   └─ api/
      ├─ photos/route.ts             # public: cursor-paginated, category filter, excludes private-album photos
      ├─ albums/[slug]/verify/route.ts  # POST: validate access code, set httpOnly cookie (rate limited)
      └─ admin/
         ├─ login / logout / presign / categories / locations / photos
         ├─ albums/route.ts          # GET list, POST create
         ├─ albums/[id]/route.ts     # PATCH (inc. generateCode), DELETE
         ├─ albums/[id]/photos/route.ts  # GET photos in album
         ├─ album-codes/[id]/route.ts    # DELETE — revoke individual access code
         └─ photos/[id]/route.ts
prisma/schema.prisma                 # Category, Location, Photo, Album, AlbumAccessCode, Tag, PhotoTag
scripts/backfill-positions.mjs       # one-time position backfill (superseded, already ran)
scripts/backfill-sort-date.mjs       # one-time sortDate backfill (already ran)
```

---

## Key deviations from original build doc

1. **Prisma 7** — no `url` in schema; connection in `prisma.config.ts`; runtime uses driver adapter.
2. **Next.js 16** — `middleware` → `proxy` (`src/proxy.ts`).
3. **shadcn `base-nova` on Base UI** — `Select.onValueChange` gives `string | null`.
4. **jimp instead of sharp** — sharp `ERR_DLOPEN_FAILED` on Vercel serverless.
5. **`prisma db push` not `migrate dev`** — migrate is interactive; shell is non-interactive. ⚠️ Migration drift: `prisma/migrations/` is behind the live DB. Before any future `prisma migrate dev`, baseline or reset.
6. **`postinstall: prisma generate`** — added for Vercel cold builds.

---

## Accounts

| Account | Needed for | Status |
|---|---|---|
| Neon (Postgres) | DB | ✅ Live — eu-central-1 |
| Cloudflare R2 | Photo storage | ✅ Live — bucket `nicpic`, r2.dev public URL |
| Vercel | Hosting | ✅ Live |

---

## 👉 Next step

The app is production-ready for Nico's personal use. Likely next things when photo uploads resume (holiday):

1. **Upload photos** via `/admin` — they'll sort correctly by `sortDate` automatically.
2. **Monitor** Vercel function logs if anything breaks at scale.

---

## Backlog / open decisions

- [x] Per-photo public URLs (`/photo/[id]`) — opens the lightbox over the same grid context; gated behind the album's access-code cookie for private-album photos. Photo cards have a hover kebab menu with "Copy link".
- [ ] Location-level filter tabs — categories only for now.
- [ ] R2 custom photo domain (currently r2.dev, rate-limited for heavy production use).
- [ ] Admin password UI (currently set in `.env.local`).
- [ ] `prisma migrate` baseline — low priority while DB is disposable.
