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
- Seed script exists: `packages/db/prisma/seed.js`.
- DB helper and error normalization are in:
  - `apps/web/lib/db.ts`
  - `apps/web/lib/db-error.ts`
  - `apps/web/lib/user.ts`

Immediate goal:
- Implement the next milestone: web UI for avatar preview + shop + inventory flow.

Hard requirements:
1. Keep server-side ownership validation as source of truth.
2. Use existing API contracts first; do not redesign API unless blocked.
3. Keep avatar layer order aligned with spec:
   - `shadow -> body -> bottom -> top -> hair -> accessory -> effect`
4. Build mobile+desktop-safe UI in Next.js app router.
5. Add manual QA checklist and curl verification steps in docs.

Execution order:
1. Create pages/components for:
   - Shop list (filter by slot)
   - Inventory list (equipped marker)
   - Avatar preview (layered rendering)
2. Wire purchase and equip actions with clear error states.
3. Add loading/empty/error states.
4. Validate with authenticated curl and in-browser manual flow.
5. Update docs with final run/test steps.

Constraints:
- Never commit secrets.
- Prefer minimal, incremental commits with clear messages.
- If DB connectivity fails, verify pooler URL and URL-encoded password first.
