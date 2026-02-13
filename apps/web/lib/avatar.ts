export const AVATAR_CANVAS = {
  width: 512,
  height: 512
} as const;

export const AVATAR_ANCHOR = {
  x: 256,
  y: 480
} as const;

export const EQUIP_SLOTS = ["hair", "top", "bottom", "accessory", "effect"] as const;

export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const LAYER_ORDER = ["shadow", "body", "bottom", "top", "hair", "accessory", "effect"] as const;

export type LayerKey = (typeof LAYER_ORDER)[number];

export type LayerRecord = Partial<Record<LayerKey, string | null>>;

export function isEquipSlot(value: string): value is EquipSlot {
  return (EQUIP_SLOTS as readonly string[]).includes(value);
}

export function createBaseLayers(): LayerRecord {
  return {
    shadow: "/avatar/shadow.svg",
    body: "/avatar/body.svg"
  };
}
