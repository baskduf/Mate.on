# Mate.on Technical Spec (v1)

## 1. Architecture
- Web/API: Next.js (App Router) on Vercel
- Auth: Clerk (Google, Discord only; no guest)
- DB: Supabase Postgres + Prisma/Drizzle
- Realtime: Dedicated Socket.io Node server (Fastify/NestJS)
- RTC: WebRTC P2P Mesh (up to 10 users/room)
- TURN: Twilio/Xirsys initially, Coturn later
- Desktop: Electron (transparent, frameless, always-on-top, tray)

## 2. Core Domain Rules
- Room model: 1 user = 1 host room
- Avatar slots: Hair, Top, Bottom, Accessory, Effect
- Asset format: 512x512, WebP preferred (PNG fallback)
- Ownership validation: server-side mandatory before equip/render sync

## 3. Services Split
- Next.js API: user/profile/inventory/shop/order/avatar state CRUD
- Socket server: presence/position/chat/room events/signaling relay
- RTC signaling: offer/answer/ice over socket rooms
- Redis Pub/Sub: cross-instance socket state sync

## 4. Realtime Events (Socket)
- `room:join`, `room:leave`
- `avatar:move` (throttled)
- `chat:bubble`
- `avatar:equip:request` -> server validates -> `avatar:equip:applied`
- `webrtc:offer`, `webrtc:answer`, `webrtc:ice`
- `stream:host:start`, `stream:host:stop`

## 5. WebRTC Quality Policy
- Max peers: 9 viewers + 1 host
- Priority: audio continuity over video quality
- Adaptive profile by viewer count:
  - 1-3: up to 1080p / 30fps
  - 4-6: up to 720p / 24fps
  - 7-10: 480-720p / 15-20fps
- Host resource guardrails trigger downgrade/recovery loops

## 6. Electron Requirements
- Transparent + frameless window
- Click-through on non-avatar pixels
- Always-on-top toggle
- Tray persistence on close
- Multi-monitor coordinate normalization
- OS permission onboarding for screen capture

## 7. Security Baseline
- Never trust client item ids/state
- Auth required for all realtime actions
- Rate limit move/chat/signaling events
- Validate room membership before signaling relay

## 8. Milestones
1) MVP: Avatar renderer + DB inventory + web preview
2) Electron: overlay shell + drag/drop + tray
3) Socket: multi-user sync for position/chat
4) WebRTC: host stream + up to 10 mesh participants
5) Final: shop integration + updater + packaging (.exe/.dmg)

## 9. Immediate Build Order
1) Monorepo skeleton (web, desktop, socket, shared)
2) DB schema (users/items/inventory/equips/rooms)
3) Auth (Clerk) and session bridge strategy for Electron
4) Socket contract and Redis adapter
5) Avatar render pipeline (canvas layer stack + anchor)
6) WebRTC mesh signaling + ABR policy
