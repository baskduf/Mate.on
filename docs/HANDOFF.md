# Mate.on Handoff (Context Compression Ready)

Last updated: 2026-02-13

## 1) Current Build State
- Monorepo apps are wired: `apps/web`, `apps/socket`, `apps/desktop`, `packages/db`, `packages/shared`.
- Clerk auth guard is active on web API routes.
- Prisma DB access is lazy-loaded in web routes via `@mateon/db/client`.
- Avatar APIs are implemented with server-side ownership validation:
  - `GET /api/avatar/me`
  - `POST /api/avatar/equip`
- Shop/Inventory APIs are implemented:
  - `GET /api/shop/items`
  - `POST /api/shop/purchase`
  - `GET /api/inventory`
- Seed script exists at `packages/db/prisma/seed.js`.

## 2) Working API Surface
- Auth check: all above routes require Clerk session.
- DB resilience:
  - Missing prisma client -> returns `503` with db-generate guidance.
  - Network/URL errors -> returns `503` with Supabase pooler guidance.
  - Query/runtime DB errors -> returns `500` with safe message (`detail` in non-production).

## 3) Known Environment Requirements
Set these in root `.env`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL` (Supabase session pooler URL for IPv4 environments)
- `DIRECT_URL` (optional direct URL if needed for migrations)
- `DEFAULT_WALLET_CREDITS` (optional, default `1000`)

Important for Supabase:
- If local network/runtime is IPv4-only, direct host `db.<project>.supabase.co:5432` may fail.
- Use pooler URL format:
  - `postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres`
- URL-encode reserved characters in password (`!`, `@`, `#`, `%`, etc.).

## 4) Boot Commands
From repo root:

```powershell
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev:web
```

Optional parallel backend start:

```powershell
npm run dev:servers
```

## 5) CURL Validation (Auth Required)
Clerk-protected routes need a valid session cookie.

1. Sign in at web app in browser.
2. Copy `__session` cookie value.
3. Run tests:

```powershell
$base = "http://localhost:3000"
$cookie = "__session=<PASTE_SESSION_COOKIE>"

curl.exe -i -H "Cookie: $cookie" "$base/api/me"
curl.exe -i -H "Cookie: $cookie" "$base/api/avatar/me"
curl.exe -i -H "Cookie: $cookie" "$base/api/shop/items?limit=5"
curl.exe -i -H "Cookie: $cookie" "$base/api/inventory"

# purchase example
curl.exe -i -X POST -H "Content-Type: application/json" -H "Cookie: $cookie" \
  -d '{"itemId":"<ITEM_ID>"}' "$base/api/shop/purchase"

# equip example
curl.exe -i -X POST -H "Content-Type: application/json" -H "Cookie: $cookie" \
  -d '{"slot":"hair","itemId":"<OWNED_ITEM_ID>"}' "$base/api/avatar/equip"
```

Expected behaviors:
- Unauthorized cookie/missing cookie -> `401`
- Non-owned equip item -> `403`
- Duplicate purchase -> `409`
- Success purchase/equip -> `200` with updated payload

## 6) Files Changed In Current Worktree
Modified:
- `.env.example`
- `apps/web/app/api/avatar/equip/route.ts`
- `apps/web/app/api/avatar/me/route.ts`
- `apps/web/lib/db.ts`
- `apps/web/types/mateon-db-client.d.ts`
- `package.json`
- `packages/db/package.json`

Untracked:
- `apps/web/app/api/inventory/route.ts`
- `apps/web/app/api/shop/items/route.ts`
- `apps/web/app/api/shop/purchase/route.ts`
- `apps/web/lib/db-error.ts`
- `apps/web/lib/user.ts`
- `packages/db/prisma/seed.js`
- `docs/UI_DESIGN_SPEC.md`

## 7) Next Implementation Priority (Recommended)
1. Web UI for Shop/Inventory/Avatar Preview (consume existing APIs).
2. Avatar layered renderer component (ordered layer stack + fallback asset handling).
3. Equip/purchase optimistic UX + rollback handling.
4. Socket integration for avatar move/chat sync.
5. Electron overlay connection (always-on-top + click-through + room join).

## 8) Risks To Handle Early
- Supabase URL/network mismatch (pooler vs direct).
- Password URL-encoding mistakes in `DATABASE_URL`.
- Clerk cookie handling for non-browser API testing.
- Mesh scaling limits for WebRTC (10 users) before SFU migration.
