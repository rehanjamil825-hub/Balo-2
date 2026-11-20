# Hosting BALO behind CloudFront (and why not as a static site)

The website is **not** a static site. Pages are server-rendered and three
features run only on the Node server:

| Feature | Endpoint | Needs the Node server |
| --- | --- | --- |
| BALO AI chat | `POST /api/chat` | yes |
| Enquiry form | server function RPC | yes |
| Admin dashboard | server function RPC | yes |
| Health check | `GET /api/health` | yes |

If you upload the `dist/` folder (or `.output/public`) to S3 and point
CloudFront at it, every page still loads — but chat answers "could not answer
that", the enquiry form fails, and admin sign-in cannot save anything. That is
the bug this document fixes at the infrastructure level.

## Correct topology

```
visitor
  │
CloudFront (HTTPS, caching, WAF)
  │  origin: nginx / Lightsail / EC2 running `npm start`
  ▼
Node server (Nitro, port 3000)
  ├── SSR pages
  ├── /api/*            → BALO AI + health
  └── /_serverFn/*      → enquiry + admin server functions
        │
        ▼
   Supabase (Postgres, Auth)
        │
        ▼
   Google Gemini (from the server only)
```

The CloudFront origin must be the **Node server** (or the nginx in front of it).
Do not add an S3 origin for the HTML.

## CloudFront settings

1. **Origin**: `balo-origin` → the Lightsail static IP or the ALB DNS name,
   protocol HTTP only, port 80 (nginx terminates the public TLS).
2. **Default cache behaviour** (`*`): use `CachingOptimized` but forward
   `Host`, and set *Viewer protocol policy* to `Redirect HTTP to HTTPS`.
3. **Do not cache these paths** — add cache behaviours with
   `CachingDisabled` and `AllViewerExceptHostHeader` origin request policy:
   - `/api/*` (chat, health)
   - `/_serverFn/*` (TanStack Start server functions: enquiry, admin)
   - `/admin*`, `/admin-login`, `/admin-reset-password`
4. **Allowed HTTP methods**: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
5. **Forward headers** required by the server: `Host`, `Origin`,
   `X-Forwarded-For`, `X-Forwarded-Proto`. The chat endpoint uses
   `X-Forwarded-For` for rate limiting and checks `Origin` for same-site posts.
6. **Compress automatically**: on (Brotli/Gzip).
7. Optional: attach AWS WAF with the managed core rule set. Rate limiting is
   already enforced in the app (see `src/lib/rate-limit.server.ts`).

## Verify the deployment

```bash
curl -s https://your-domain/api/health | jq
```

Expected:

```json
{
  "ok": true,
  "runtime": "node",
  "features": { "serverFunctions": true, "chat": true, "enquiry": true, "admin": true }
}
```

- HTTP 404 or an HTML body → CloudFront is pointed at a static origin (or the
  `/_serverFn` behaviour is missing). Fix the origin, not the app.
- `"chat": false` → the Gemini key is missing from `.env` on the server.
- `"admin": false` → `SUPABASE_SERVICE_ROLE_KEY` is missing.

`npm run build` now runs `scripts/verify-server-build.mjs`, which fails the
build if no Node server bundle was produced. That stops a static-only build
from reaching production unnoticed.

## Supabase redirect URLs

Admin email links (verification and password reset) must be allow-listed:

Supabase dashboard → **Authentication → URL Configuration**:

- Site URL: `https://your-domain`
- Redirect URLs:
  - `https://your-domain/admin-login`
  - `https://your-domain/admin-reset-password`
  - `http://localhost:5173/admin-login` (local development)
  - `http://localhost:5173/admin-reset-password`
  - your Lovable preview domain, if you use it

Otherwise the reset link opens the Supabase error page instead of the form.
