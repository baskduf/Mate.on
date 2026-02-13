import type { PrismaClientLike } from "./db";

export const DEFAULT_WALLET_CREDITS = Number(process.env.DEFAULT_WALLET_CREDITS ?? 1000);

export function defaultDisplayName(userId: string) {
  return `mate_${userId.slice(-6)}`;
}

export async function ensureDbUser(prisma: PrismaClientLike, clerkUserId: string) {
  const user = await prisma.user.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      displayName: defaultDisplayName(clerkUserId)
    }
  });

  await prisma.walletBalance.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      credits: DEFAULT_WALLET_CREDITS
    }
  });

  return user;
}
