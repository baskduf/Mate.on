declare module "@mateon/db/client" {
  export const prisma: {
    user: { upsert: (args: unknown) => Promise<any> };
    avatarEquip: { findMany: (args: unknown) => Promise<any[]>; upsert: (args: unknown) => Promise<any> };
    avatarItem: { findFirst: (args: unknown) => Promise<any> };
    inventoryItem: { findFirst: (args: unknown) => Promise<any> };
  };
}
