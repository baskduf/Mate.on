type PrismaClientLike = {
  user: { upsert: (args: unknown) => Promise<any> };
  avatarEquip: { findMany: (args: unknown) => Promise<any[]>; upsert: (args: unknown) => Promise<any> };
  avatarItem: { findFirst: (args: unknown) => Promise<any> };
  inventoryItem: { findFirst: (args: unknown) => Promise<any> };
};

declare global {
  var __mateonPrisma: PrismaClientLike | undefined;
}

export async function getPrismaClient(): Promise<PrismaClientLike> {
  if (global.__mateonPrisma) {
    return global.__mateonPrisma;
  }

  const moduleRef = (await import("@mateon/db/client")) as {
    prisma: PrismaClientLike;
  };
  const client = moduleRef.prisma;

  if (process.env.NODE_ENV !== "production") {
    global.__mateonPrisma = client;
  }

  return client;
}
