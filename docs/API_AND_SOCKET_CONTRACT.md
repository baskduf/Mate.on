# Mate.on API + Socket Contract (v1)

## REST API (Next.js)

### Auth
- Clerk middleware protects all private routes.

### Avatar
- `GET /api/avatar/me`
  - returns equipped items + resolved asset URLs
- `POST /api/avatar/equip`
  - body: `{ slot, itemId }`
  - server checks ownership and slot compatibility
  - updates equipped state and emits realtime sync event

### Inventory/Shop
- `GET /api/inventory`
- `GET /api/shop/items?slot=&cursor=`
- `POST /api/shop/purchase`
  - body: `{ itemId }`
  - transactional write (currency decrement + ownership insert)

### Room
- `GET /api/rooms/:hostUserId`
  - returns join metadata (host online status, room policy)

## Socket Namespaces
- `/presence` for avatar position/chat/state
- `/signal` for WebRTC signaling

## Presence Events
- client -> server
  - `room:join` `{ hostUserId }`
  - `room:leave` `{ hostUserId }`
  - `avatar:move` `{ x, y, vx, vy, monitorId, ts }`
  - `chat:bubble` `{ text, ts }`
- server -> client
  - `room:user_joined` `{ userId, avatarState }`
  - `room:user_left` `{ userId }`
  - `avatar:state` `{ userId, x, y, equipped, motion, ts }`
  - `chat:bubble` `{ userId, text, ts }`

## Equip Validation Flow
1) client sends `POST /api/avatar/equip`
2) API verifies Clerk user
3) API checks `inventory_items` ownership
4) API upserts equipped slot row
5) API emits `avatar:state` with canonical equipped state

## WebRTC Signaling Events (`/signal`)
- client -> server
  - `signal:join` `{ hostUserId }`
  - `webrtc:offer` `{ toPeerId, sdp }`
  - `webrtc:answer` `{ toPeerId, sdp }`
  - `webrtc:ice` `{ toPeerId, candidate }`
  - `stream:host:start` `{ constraintsProfile }`
  - `stream:host:stop` `{}`
- server -> client
  - `signal:peer_joined` `{ peerId }`
  - `webrtc:offer` `{ fromPeerId, sdp }`
  - `webrtc:answer` `{ fromPeerId, sdp }`
  - `webrtc:ice` `{ fromPeerId, candidate }`
  - `stream:host:start` `{ hostPeerId }`
  - `stream:host:stop` `{ hostPeerId }`

## Server Safeguards
- per-socket auth token verification (Clerk JWT)
- host room membership checks before forwarding signaling
- event rate limits:
  - `avatar:move`: 20/s hard cap, throttle to 10-15/s broadcast
  - `chat:bubble`: 3 messages / 5s
  - signaling flood protection with backoff
