# Mate.on Handoff (Context Compression Ready)

Last updated: 2026-02-13

## 1) Current Build State
- Monorepo apps are wired: `apps/web`, `apps/socket`, `apps/desktop`, `packages/db`, `packages/shared`.
- Clerk auth guard is active on web API routes.
- Prisma DB access is lazy-loaded in web routes via `@mateon/db/client`.
- Web UI milestone is implemented:
  - Avatar preview + shop + inventory dashboard
  - Purchase/equip action wiring with loading/error/empty states
  - Mobile-safe responsive layout with design spec palette/theme
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
- `apps/socket/package.json`
- `apps/socket/src/main.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/package.json`
- `docs/HANDOFF.md`
- `docs/NEXT_AGENT_PROMPT.md`
- `package-lock.json`

Untracked:
- `apps/web/app/api/socket/token/route.ts`
- `apps/web/app/globals.css`
- `apps/web/components/avatar-dashboard.module.css`
- `apps/web/components/avatar-dashboard.tsx`
- `apps/web/components/realtime-presence-panel.module.css`
- `apps/web/components/realtime-presence-panel.tsx`
- `apps/web/components/realtime-signal-panel.module.css`
- `apps/web/components/realtime-signal-panel.tsx`
- `apps/web/lib/signal-client.ts`
- `apps/socket/src/signal-routing.ts`
- `apps/socket/src/signal-routing.test.ts`

## 7) Next Implementation Priority (Recommended)
1. Improve reconnect behavior (auto rejoin + re-offer/re-answer recovery).
2. Add socket-level integration tests for room join/leave/relay behavior.
3. QA hardening for purchase/equip race conditions, pagination UX, and socket reconnect behavior.

## 8) Risks To Handle Early
- Supabase URL/network mismatch (pooler vs direct).
- Password URL-encoding mistakes in `DATABASE_URL`.
- Clerk cookie handling for non-browser API testing.
- Mesh scaling limits for WebRTC (10 users) before SFU migration.

## 9) Web UI Manual QA Checklist (Avatar + Shop + Inventory)
Preconditions:
- `npm install`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`
- `npm run dev:web`
- Signed in via Clerk in browser session.

Checklist:
1. Open `http://localhost:3000`.
2. Confirm three panels render: `Avatar Preview`, `Shop`, `Inventory`.
3. In `Shop`, switch slot filters (`All/Hair/Top/Bottom/Accessory/Effect`) and verify list updates.
4. Purchase a not-owned item and verify:
   - Success notice appears.
   - `Inventory` list now includes the purchased item.
   - Shop button changes to `Owned`.
5. In `Inventory`, click `Equip` on an owned item and verify:
   - Item gets `Equipped` marker.
   - `Avatar Preview` layer image updates in correct order:
     `shadow -> body -> bottom -> top -> hair -> accessory -> effect`.
6. Force a negative case and verify visible error message:
   - Buy already-owned item -> `409`.
   - Buy with insufficient credits -> `402`.
   - Equip non-owned item via direct API call -> `403`.
7. Reload the page and verify equipped state persists from API.

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

## 11) Realtime Presence QA Checklist
Preconditions:
- `npm run dev:servers`
- Signed in via Clerk browser session
- Open at least two browser windows (or two different users)

Checklist:
1. Open `http://localhost:3000` in both windows.
2. In `Realtime Presence`, confirm `Host User ID` is auto-filled for signed-in user.
3. Connect both clients to the same `Host User ID`.
4. Verify status changes to `connected` and presence logs show join events.
5. Move one client with Arrow/WASD and verify the other client sees remote avatar coordinates updating.
6. Send chat from one client and verify the other client receives the message.
7. Disconnect one client and verify `room:user_left` behavior in remaining client.

## 12) Realtime Signaling QA Checklist (Web + Desktop)
Preconditions:
- `npm run dev:servers`
- `npm run dev:web`
- `npm run dev:desktop`
- Signed in via Clerk for each client context used in test
- Shared host room id prepared (host user's Clerk user id)

Checklist:
1. Open web client and desktop overlay, and ensure both show `Realtime Signal` panel.
2. Verify `Host User ID` is prefilled from profile or query param.
3. In host client:
   - choose role `host`
   - connect
   - confirm status `connected`
4. In viewer client:
   - choose role `viewer`
   - connect to same `Host User ID`
   - confirm `peer joined` appears in logs on both sides.
5. On host client, click `Start Host Stream`.
6. Approve media permission prompt and confirm host local video preview appears.
7. Confirm viewer receives `host stream start` log and remote video tile appears.
8. Trigger `Renegotiate` on host for selected peer and confirm offer/answer logs continue without error.
9. On host client, click `Stop Host Stream` and verify viewer receives `host stream stop` log and remote stream tile is removed.
10. Disconnect a viewer and verify host logs `peer left` and removes the peer stream immediately.
11. Negative case: connect a third client to a different host room id and verify signaling messages are not relayed across rooms.
