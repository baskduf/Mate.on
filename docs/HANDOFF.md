# Mate.on Handoff (Context Compression Ready)

Last updated: 2026-02-13

## 1) Current Build State
- Monorepo apps are wired: `apps/web`, `apps/socket`, `apps/desktop`, `packages/db`, `packages/shared`.
- Clerk auth guard is active on web API routes.
- Prisma DB access is lazy-loaded in web routes via `@mateon/db/client`.
- Web UI milestone is implemented:
  - Game-style mobile shell (`GameLayout`) with scene transitions and bottom navigation
  - Route-based scenes: `/` (홈/My Room), `/shop` (상점), `/square` (광장 placeholder), `/character` (캐릭터)
  - `/create-avatar` UI route is not implemented yet (backend API is ready)
  - Korean-first labels in navigation/UI (`홈`, `광장`, `상점`, `캐릭터`)
  - Purchase/equip action wiring with loading/error/empty states in scene flow
- Realtime presence panel is implemented in web:
  - Socket connect/disconnect
  - Room join/leave
  - Avatar move sync (`avatar:move` -> `avatar:state`)
  - Chat sync (`chat:bubble`)
- Realtime signal panel is implemented in web:
  - `/signal` connect/disconnect
  - Host/viewer room join (`signal:join`)
  - Peer discovery (`signal:peer_joined`)
  - Peer departure handling (`signal:peer_left`) for immediate remote cleanup
  - `RTCPeerConnection` offer/answer/ice exchange wired to socket relay
  - Host media capture start/stop and local preview
  - Viewer remote media rendering per peer stream
  - Host-side re-negotiate action for selected peer
- Signal server routing safeguards are implemented:
  - Relay is dropped unless sender and target peers share the same signal room
  - Invalid or empty `hostUserId` join payload is ignored
  - `signal:peer_left` broadcast on room switch and disconnect
  - Shared-room resolver extracted to `apps/socket/src/signal-routing.ts`
- Avatar APIs are implemented with server-side ownership validation:
  - `GET /api/avatar/me`
  - `POST /api/avatar/create`
  - `POST /api/avatar/equip`
- Shop/Inventory APIs are implemented:
  - `GET /api/shop/items`
  - `POST /api/shop/purchase`
  - `GET /api/inventory`
- Socket token API for client handshake:
  - `GET /api/socket/token`
- Desktop overlay URL is room-aware:
  - `MATEON_ROOM_HOST_USER_ID` sets default host room id
  - `MATEON_SIGNAL_ROLE` sets default signal role (`viewer` or `host`)
  - `MATEON_SIGNAL_AUTOCONNECT` controls auto signal connect on launch
  - `MATEON_CONTENT_PROTECTION` toggles `setContentProtection(true)` (default enabled)
- Realtime equip sync event is implemented:
  - Presence namespace relays `avatar:equip`
  - Web client publishes equip updates after successful equip API response
  - Web client listens for `avatar:equip` and updates avatar layers in-place
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
- `SOCKET_IO_PORT` (optional, default `4002`)
- `NEXT_PUBLIC_SOCKET_URL` (optional web socket server URL, default `http://localhost:4002`)
- `MATEON_WEB_URL` (optional desktop overlay target URL, default `http://localhost:3000`)
- `MATEON_ROOM_HOST_USER_ID` (optional desktop default room id for signaling)
- `MATEON_SIGNAL_ROLE` (optional desktop default role, `viewer` or `host`, default `viewer`)
- `MATEON_SIGNAL_AUTOCONNECT` (optional desktop auto connect toggle, default `1`)
- `MATEON_CONTENT_PROTECTION` (optional desktop capture-protection toggle, default `1`)

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
npm run dev:servers
```

Or run separately:

```powershell
npm run dev:web
npm run dev:socket
npm run dev:desktop
```

Automated signal routing tests:

```powershell
npm --workspace @mateon/socket run test
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
- Unauthorized cookie/missing cookie -> `307` (Clerk sign-in redirect in current dev setup; some setups may return `401`)
- Non-owned equip item -> `403`
- Duplicate purchase -> `409`
- Success purchase/equip -> `200` with updated payload

## 6) Files Changed In Current Worktree
Modified:
- `.env.example`
- `apps/desktop/package.json`
- `apps/desktop/src/main.ts`
- `apps/desktop/tsconfig.json`
- `apps/socket/src/main.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/components/avatar-preview.tsx`
- `apps/web/next-env.d.ts`
- `apps/web/package.json`
- `docs/HANDOFF.md`
- `docs/NEXT_AGENT_PROMPT.md`
- `package-lock.json`
- `packages/shared/src/socket-events.ts`

Untracked:
- `apps/web/app/api/socket/token/route.ts`
- `apps/web/app/globals.css`
- `apps/web/app/shop/page.tsx`
- `apps/web/app/square/page.tsx`
- `apps/web/components/avatar-dashboard.module.css`
- `apps/web/components/avatar-dashboard.tsx`
- `apps/web/components/avatar/avatar-preview.tsx`
- `apps/web/components/game-layout.module.css`
- `apps/web/components/game-layout.tsx`
- `apps/web/components/inventory/inventory-sheet.module.css`
- `apps/web/components/inventory/inventory-sheet.tsx`
- `apps/web/components/realtime-presence-panel.module.css`
- `apps/web/components/realtime-presence-panel.tsx`
- `apps/web/components/realtime-signal-panel.module.css`
- `apps/web/components/realtime-signal-panel.tsx`
- `apps/web/components/scenes/my-room.module.css`
- `apps/web/components/scenes/my-room.tsx`
- `apps/web/components/scenes/shop-scene.module.css`
- `apps/web/components/scenes/shop-scene.tsx`
- `apps/web/lib/signal-client.ts`
- `apps/socket/src/signal-routing.ts`
- `apps/socket/src/signal-routing.test.ts`

## 7) Next Implementation Priority (Recommended)
1. Frontend: implement `/create-avatar` scene and wire My Room empty-state `생성하기` button to `POST /api/avatar/create`.
2. Define/implement `광장` MVP behavior (placeholder vs realtime presence-driven scene).
3. Add socket-level integration tests for `avatar:equip` relay and room-boundary isolation.
4. Decide whether realtime debug panels should move to a dedicated route (for example `/debug/realtime`).

## 8) Risks To Handle Early
- Supabase URL/network mismatch (pooler vs direct).
- Password URL-encoding mistakes in `DATABASE_URL`.
- Clerk cookie handling for non-browser API testing.
- Legacy realtime debug panels are not part of main scene routes, so feature regressions can be missed without dedicated QA route/tests.

## 9) Web UI Manual QA Checklist (Game Scene UI)
Preconditions:
- `npm install`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`
- `npm run dev:web`
- Signed in via Clerk in browser session.

Checklist:
1. Open `http://localhost:3000`.
2. Confirm top bar currency and bottom navigation render (`홈`, `광장`, `상점`, `캐릭터`).
3. On `홈` (My Room):
   - avatar shows when owned/equipped data exists
   - empty-state shows `생성하기` when no avatar state exists
   - `캐릭터` button routes to `/character`.
4. (Frontend 구현 후) `생성하기`에서 `/create-avatar` 진입 후 starter avatar 생성이 완료되는지 확인.
5. Open `/character` and verify owned items render and `착용` action is available.
5. Navigate to `상점` and switch slot filters (`전체/헤어/상의/하의/악세/이펙트`) and verify list updates.
6. Purchase a not-owned item and verify:
   - success notice appears
   - inventory sheet contains newly purchased item
   - shop item action changes to `보유`.
7. In inventory sheet, click `착용` on owned item and verify:
   - item shows `착용중`
   - My Room avatar layer updates immediately.
8. Reload page and verify equipped state persists from API.

## 10) CURL Verification For UI-Connected Flows
Use browser `__session` cookie value from a signed-in Clerk session.

```powershell
$base = "http://localhost:3000"
$cookie = "__session=<PASTE_SESSION_COOKIE>"

# Read current state
curl.exe -i -H "Cookie: $cookie" "$base/api/avatar/me"
curl.exe -i -H "Cookie: $cookie" "$base/api/shop/items?limit=10&slot=hair"
curl.exe -i -H "Cookie: $cookie" "$base/api/inventory"

# Purchase candidate item (replace ITEM_ID)
curl.exe -i -X POST -H "Content-Type: application/json" -H "Cookie: $cookie" `
  -d '{"itemId":"<ITEM_ID>"}' "$base/api/shop/purchase"

# Equip owned item (replace OWNED_ITEM_ID + slot)
curl.exe -i -X POST -H "Content-Type: application/json" -H "Cookie: $cookie" `
  -d '{"slot":"hair","itemId":"<OWNED_ITEM_ID>"}' "$base/api/avatar/equip"
```

Expected status guidance:
- Missing/invalid cookie -> `307` (Clerk sign-in redirect in current dev setup; some setups may return `401`)
- Duplicate purchase -> `409`
- Insufficient credits -> `402`
- Equip non-owned item -> `403`
- Successful purchase/equip -> `200`

## 11) Realtime Equip Sync QA Checklist
Preconditions:
- `npm run dev:servers`
- `npm run dev:web`
- Signed in via Clerk browser session
- Open two browser windows with the same signed-in user (same `hostUserId` room)

Checklist:
1. Open `http://localhost:3000` in both windows.
2. In window A, open inventory (`메뉴`) and equip an item.
3. Verify window B home avatar updates layer/equipped state without manual refresh.
4. Repeat in opposite direction (window B equip -> window A reflects update).
5. Disconnect/reopen one window and confirm sync still works after reconnect.

## 12) Legacy Realtime Panels QA Note
Current main routes (`/`, `/shop`, `/square`) no longer render `RealtimePresencePanel` and `RealtimeSignalPanel`.

Preconditions:
- `npm run dev:servers`
- `npm run dev:web`
- `npm run dev:desktop`

Checklist:
1. If these panels are still needed, expose them behind a dedicated debug route (for example `/debug/realtime`) before QA.
2. Validate signaling events there, not on the main game scene routes.
