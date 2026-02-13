# Mate.on DB Schema Draft (PostgreSQL)

## Tables

### users
- `id` (uuid, pk)
- `clerk_user_id` (text, unique, not null)
- `display_name` (text, not null)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### avatar_items
- `id` (uuid, pk)
- `slot` (enum: hair|top|bottom|accessory|effect)
- `name` (text)
- `rarity` (enum)
- `price` (int)
- `asset_webp_url` (text)
- `asset_png_url` (text, nullable)
- `is_active` (bool)
- `created_at` (timestamptz)

### inventory_items
- `id` (uuid, pk)
- `user_id` (uuid, fk -> users.id)
- `item_id` (uuid, fk -> avatar_items.id)
- `acquired_at` (timestamptz)
- unique(`user_id`, `item_id`)

### avatar_equips
- `user_id` (uuid, fk -> users.id)
- `slot` (enum)
- `item_id` (uuid, fk -> avatar_items.id)
- `updated_at` (timestamptz)
- pk(`user_id`, `slot`)

### rooms
- `host_user_id` (uuid, fk -> users.id, pk)
- `is_online` (bool)
- `title` (text, nullable)
- `updated_at` (timestamptz)

### room_participants
- `id` (uuid, pk)
- `host_user_id` (uuid, fk -> rooms.host_user_id)
- `participant_user_id` (uuid, fk -> users.id)
- `joined_at` (timestamptz)
- `left_at` (timestamptz, nullable)

### wallet_balances
- `user_id` (uuid, pk, fk -> users.id)
- `credits` (int)
- `updated_at` (timestamptz)

### purchase_logs
- `id` (uuid, pk)
- `user_id` (uuid, fk -> users.id)
- `item_id` (uuid, fk -> avatar_items.id)
- `amount` (int)
- `created_at` (timestamptz)

## Indexes
- `inventory_items(user_id)`
- `avatar_equips(user_id)`
- `room_participants(host_user_id, left_at)`
- `users(clerk_user_id)`

## Integrity Constraints
- equip trigger/policy: equipped item must exist in `inventory_items`
- slot consistency: equipped item slot must equal requested slot
- purchase transaction: insert inventory + deduct wallet atomically
