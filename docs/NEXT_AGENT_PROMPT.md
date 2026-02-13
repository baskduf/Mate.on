# Next Agent Prompt (Copy/Paste)

You are continuing the Mate.on monorepo.

Context:
- Stack: Next.js (web/api), Electron (desktop), Socket.io (separate node server), Prisma + Supabase.
- Auth: Clerk required for protected APIs.
- Current APIs implemented and working with DB:
  - `GET /api/me`
  - `GET /api/avatar/me`
  - `POST /api/avatar/equip`
  - `GET /api/shop/items`
  - `POST /api/shop/purchase`
  - `GET /api/inventory`
- New API:
  - `GET /api/socket/token` (returns Clerk session token for socket handshake)
- Seed script exists: `packages/db/prisma/seed.js`.
- DB helper and error normalization are in:
  - `apps/web/lib/db.ts`
  - `apps/web/lib/db-error.ts`
  - `apps/web/lib/user.ts`
- Web UI milestones completed:
  - Avatar preview + shop + inventory dashboard
  - Purchase/equip actions + loading/empty/error handling
  - Realtime presence panel (`/presence`): connect/join/move/chat sync
  - Realtime signal panel (`/signal`): host/viewer join, peer discovery, live offer/answer/ice handling, host media start/stop, local/remote stream render
- Electron overlay milestones completed:
  - Transparent frameless window
  - Always-on-top toggle
  - Click-through toggle
  - Tray persistence and shortcuts
  - Overlay URL query integration for room onboarding (`hostUserId`, `signalRole`, `signalAutoConnect`)
- Socket signaling safeguards completed:
  - `signal:join` now replays existing peer IDs to the joining client
  - `signal:peer_left` notifies room members on room switch/disconnect for immediate remote cleanup
  - offer/answer/ice relay now validates sender/target room membership before forwarding
  - Room id sanitize + shared-room resolver extracted to `apps/socket/src/signal-routing.ts` with tests

Immediate goal:
- Harden peer lifecycle and operational stability for the live WebRTC flow.

Hard requirements:
1. Keep server-side ownership validation as source of truth.
2. Use existing API contracts first; do not redesign API unless blocked.
3. Keep socket auth mandatory for all realtime actions.
4. Keep room membership validation for every signaling relay event.
5. Keep multi-client signaling QA checklist current in docs.

Execution order:
1. Improve reconnection behavior (re-join + re-negotiate) for both host and viewer roles.
2. Add guardrails for media permission errors and retry UX in signal panel.
3. Expand automated tests for signal room/routing behavior beyond pure helper coverage.
4. Add socket-level integration tests for join/leave/relay across room boundaries.
5. Keep docs QA aligned with real WebRTC media behavior.

Constraints:
- Never commit secrets.
- Prefer minimal, incremental commits with clear messages.
- If DB connectivity fails, verify pooler URL and URL-encoded password first.
