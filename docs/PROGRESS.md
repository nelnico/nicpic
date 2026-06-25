# Build Progress — Nico's Photo Portfolio

> **Purpose:** single source of truth for where this build is, so work can resume after any restart.
> **Last updated:** 2026-06-25

---

## ⏸ Where we are right now (resume here)

**App is live on Vercel. Build is green. All core features done.**

The gallery is a fully functional photo portfolio with:
- **Public gallery** — CSS Grid masonry, left-to-right ordering, infinite scroll (30/page, cursor-based), category filter tabs, lightbox with swipe + pinch-to-zoom + EXIF panel.
- **Admin** — drag-and-drop photo reordering, thumbnail grid, upload/edit dialog, category/location/tag management.
- **Storage** — Cloudflare R2 (upload via presigned URL, thumbnails generated server-side with jimp).
- **DB** — Neon Postgres via Prisma 7 + `@prisma/adapter-pg`.

**To resume dev:** `npm run dev` — no stale env issues, no migrations pending.

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
| Drag-and-drop | dnd-kit | @dnd-kit/core, /sortable, /utilities |
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

### Photo ordering
- `Photo.position Int` column (replaced `featured`). Oldest photo = position 1, newest = N.
- Gallery orders by `position DESC` (highest = top).
- New uploads get `max(position) + 1` automatically.
- Backfilled via `scripts/backfill-positions.mjs` (ran once).
- **Schema applied via `prisma db push` (not migrate)** due to pre-existing drift. See migration note below.

### Admin drag-and-drop reorder
- `PATCH /api/admin/photos/reorder` accepts `{ ids: string[] }` in display order, writes positions in a transaction.
- Admin grid uses dnd-kit (`rectSortingStrategy`), optimistic update with server rollback on error.
- Thumbnail grid: `grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8`.

### Upload photo dialog enhancements
- **+ buttons on selects**: Category, Location, and Album selects each have a small `+` button that opens a quick-add dialog. Validates (not empty, not duplicate), saves to API, auto-selects the new item.
- **Date picker**: `When taken` field replaced with a Base UI Popover + react-day-picker calendar (`src/components/ui/date-picker.tsx`). Stores as `YYYY-MM-DD` string, same as before.
- `react-day-picker` added as a dependency.

### Albums
- `Album` model: name, slug, description, locationId (optional), coverPhotoId (unused in UI — collage used instead), createdAt, updatedAt.
- `Photo.albumId` optional FK → Album (onDelete: SetNull).
- Admin: Albums card in Library section — create/edit/delete. Upload dialog shows optional album picker when albums exist.
- Public: `/albums` listing (album cards with 2×2 photo collage if 5+ photos, single photo if fewer), `/albums/[slug]` detail page with full masonry gallery + lightbox.
- Nav lives in `app/(public)/layout.tsx` — shared across all public pages. Admin has its own layout.
- `focalLength35mm` removed from schema, API, dialog, types, gallery, lightbox.

### Featured flag — removed
- Removed from schema, API, admin UI, and photo dialog.

### Public gallery
- **CSS Grid masonry**: `gridAutoRows: 4px`, `gap: 12px`, span computed via `ResizeObserver` on the `<img>` element (`contentRect.height`). Observing the image (not the button) fixes stale spans on column-count breakpoint crossings.
- **Infinite scroll**: cursor-based (`position DESC`), 30 photos/page, `IntersectionObserver` sentinel with `rootMargin: 300px`. `isFirstRender` ref skips mount fetch (SSR data already loaded).
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
│  ├─ r2.ts                          # S3 client → R2; thumbnail generation via jimp
│  ├─ auth.ts                        # JWT session cookie helpers
│  └─ utils.ts                       # shadcn cn()
├─ config/site.ts                    # all branding (name, eyebrow, title, description)
├─ types/photo.ts                    # Photo + Category types (public shape)
├─ components/
│  ├─ ui/                            # shadcn components
│  ├─ gallery/
│  │  ├─ gallery.tsx                 # main gallery (infinite scroll, filter, lightbox wiring)
│  │  ├─ nav.tsx                     # sticky top nav
│  │  ├─ filter-bar.tsx              # sticky category tabs
│  │  ├─ photo-card.tsx              # masonry card (ResizeObserver span)
│  │  ├─ lightbox.tsx                # full-screen lightbox + pinch zoom
│  │  └─ content-guard.tsx           # (layout-level)
│  └─ admin/
│     ├─ photos-manager.tsx          # dnd-kit drag-to-reorder thumbnail grid
│     ├─ photo-dialog.tsx            # upload + edit dialog
│     └─ taxonomy-manager.tsx        # categories / locations / tags CRUD
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
   │  └─ login/page.tsx
   └─ api/
      ├─ photos/route.ts             # public: cursor-paginated, category filter
      └─ admin/
         ├─ login / logout / presign / categories / locations / photos
         ├─ albums/route.ts          # GET list, POST create
         ├─ albums/[id]/route.ts     # PATCH, DELETE
         ├─ albums/[id]/photos/route.ts  # GET photos in album
         ├─ photos/[id]/route.ts
         └─ photos/reorder/route.ts  # PATCH — drag-and-drop position save
prisma/schema.prisma                 # Category, Location, Photo, Album, Tag, PhotoTag
scripts/backfill-positions.mjs       # one-time position backfill (already ran)
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

1. **Upload photos** via `/admin` — they'll get correct positions automatically.
2. **Reorder** via drag-and-drop in admin if needed.
3. **Monitor** Vercel function logs if anything breaks at scale.

---

## Backlog / open decisions

- [ ] Per-photo public URLs (`/photo/[id]`) — not in Lovable design, can add later.
- [ ] Location-level filter tabs — categories only for now.
- [ ] R2 custom photo domain (currently r2.dev, rate-limited for heavy production use).
- [ ] Admin password UI (currently set in `.env.local`).
- [ ] `prisma migrate` baseline — low priority while DB is disposable.
