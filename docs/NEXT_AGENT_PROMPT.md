# Next Agent Prompt (Copy/Paste)

You are continuing the Mate.on monorepo.

Context:
- Stack: Next.js (web/api), Electron (desktop), Socket.io (separate node server), Prisma + Supabase.
- Auth: Clerk required for protected APIs.
- Current APIs implemented and DB-wired:
  - `GET /api/me`
  - `GET /api/avatar/me`
  - `POST /api/avatar/equip`
  - `GET /api/shop/items`
  - `POST /api/shop/purchase`
  - `GET /api/inventory`
  - `GET /api/socket/token`
- Web UI has been restructured into a game-like scene flow:
  - `/` renders My Room scene (home)
  - `/shop` renders shop scene
  - `/square` renders square placeholder scene
  - shared mobile game shell with top currency + bottom nav (home, shop, square, menu)
  - inventory is a slide-up sheet opened via My Room edit button or bottom menu
- Avatar component split:
  - `AvatarPreview` moved to `apps/web/components/avatar/avatar-preview.tsx`
  - compatibility re-export remains at `apps/web/components/avatar-preview.tsx`
- Realtime equip sync has been added on presence namespace:
  - new event `avatar:equip` in `packages/shared/src/socket-events.ts`
  - relay in `apps/socket/src/main.ts`
  - client emit/listen wiring in `apps/web/components/avatar-dashboard.tsx`
- Realtime signal panel refreshes auth token on unauthorized reconnect attempts:
  - client retries `/api/socket/token` on `connect_error` and updates socket auth before reconnect
- Electron overlay now supports capture protection toggle:
  - `MATEON_CONTENT_PROTECTION` (default enabled) controls `BrowserWindow.setContentProtection(true)`

Immediate goal:
- Complete onboarding and scene polish for the new game UI while preserving existing API/socket contracts.

Hard requirements:
1. Keep server-side ownership validation as source of truth.
2. Use existing API contracts first; do not redesign API unless blocked.
3. Keep socket auth mandatory for all realtime actions.
4. Keep room membership validation for signaling/presence relays.
5. Keep docs QA and handoff sections aligned with current route structure.

Recommended execution order:
1. Implement real `/create-avatar` route and connect My Room empty-state create button.
2. Define square scene MVP scope (placeholder vs presence-driven multiplayer view) and implement incrementally.
3. Decide whether realtime debug panels should live behind a dedicated debug route instead of main scene UI.
4. Add/extend tests for `avatar:equip` relay and UI-side sync behavior.
5. Update `.env.example` if new runtime flags are required by desktop/web behavior.

Constraints:
- Never commit secrets.
- Prefer minimal, incremental commits with clear messages.
- If DB connectivity fails, verify pooler URL and URL-encoded password first.
