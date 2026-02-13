# Mate.on Step-by-Step Execution Guide

## Step 1 Completed: Monorepo Skeleton
- Root workspace + apps/web + apps/socket + apps/desktop + packages/shared + packages/db

## Step 2 Completed: DB Base (Prisma)
- `packages/db/prisma/schema.prisma` created with core tables/enums
- root scripts include `db:generate`, `db:migrate:dev`

## Step 3 Completed: Auth Skeleton
- Web: Clerk middleware and protected `/api/me`
- Socket: Clerk JWT verification middleware (`apps/socket/src/auth.ts`)

## Step 4 Completed: Realtime Contract Wiring
- Shared socket event typings
- `/presence`, `/signal` namespace base handlers wired

## Step 5 Next Immediate Tasks
1. Install dependencies
   - `npm install`
2. Generate Prisma client
   - `npm run db:generate`
3. Run DB migration (after Supabase/local DB ready)
   - `npm run db:migrate:dev -- --name init`
4. Boot each service
   - Web: `npm run dev:web`
   - Socket: `npm run dev:socket`
   - Desktop: `npm run dev:desktop`

## Definition of Done for Next Iteration
- Web login via Clerk (Google/Discord) works
- `/api/me` returns authenticated user id
- Socket rejects missing/invalid token
- User can join host room and receive basic move/chat events
