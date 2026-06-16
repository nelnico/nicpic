# Cloudflare R2 setup — brief for Claude Desktop

> Paste everything below the line into Claude Desktop. It will walk you through the
> Cloudflare dashboard step by step. At the end you'll have 5 values to bring back.

---

I'm building a personal photography portfolio — a Next.js web app that runs on my
machine now and will deploy to Vercel later. It stores the actual photo image files on
**Cloudflare R2** (which is S3-compatible). I have near-zero Cloudflare experience —
please walk me through this **step by step** in the dashboard, and I'll paste screenshots.
I need some specific values at the end to put into my app's config.

## What the app needs R2 to do
1. **Store photos** in a single bucket.
2. **Accept direct uploads from the browser.** My app generates a *presigned PUT URL* and
   the browser uploads the file straight to R2. → This means the bucket **must have a CORS
   policy** allowing `PUT` from my website, or uploads will fail with a CORS error.
3. **Serve photos publicly** over HTTPS so they display on the website.

## Please help me create / configure
1. A **free Cloudflare account** if I don't already have one.
2. An **R2 bucket** named **`nico-portfolio`** (location: Automatic, or nearest to South Africa).
3. **Public access** for the bucket so images are viewable. There are two ways — please
   explain the tradeoffs and recommend one for now:
   - the **r2.dev public development URL** (fast, no domain needed, rate-limited / not for heavy production), or
   - a **custom domain** like `photos.<mydomain>` (permanent + fast via CDN, but my domain's
     DNS is currently at **Afrihost**, not Cloudflare, so this needs extra setup).
   I'm fine starting with the r2.dev URL and adding a custom domain later.
4. A **CORS policy** on the bucket so the browser can upload. Start with this (we'll add my
   real production domain later):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. An **R2 API token** with **Object Read & Write** permission (scoping it to this one
   bucket is fine). Creating it gives me **S3-compatible credentials** (an Access Key ID +
   Secret Access Key) — that's what I need, not the plain bearer "API token" string.

## Values I need to collect (I'll paste these into my app)
| Name | What it is | Where to find it |
|---|---|---|
| `R2_ACCOUNT_ID` | My Cloudflare account ID | R2 overview page / it's also the subdomain in the S3 endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Access Key ID | shown when I create the R2 API token |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key | shown when I create the token — **only once**, copy immediately |
| `R2_BUCKET_NAME` | `nico-portfolio` | the bucket I created |
| `R2_PUBLIC_URL` | Public base URL for the bucket, **no trailing slash** | e.g. `https://pub-abc123.r2.dev` (r2.dev) or `https://photos.mydomain.com` (custom domain) |

## Important notes
- The **Secret Access Key is displayed only once** — copy it the moment it appears.
- For the token, make sure I get the **Access Key ID + Secret Access Key** pair (the
  S3-style credentials), not just the bearer API token.
- `R2_PUBLIC_URL` must have **no trailing slash**.
- Don't worry about my production website domain yet — `localhost` is fine for now.

When we're done, please give me a clean list of those 5 values.
