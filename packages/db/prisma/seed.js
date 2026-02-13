"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STARTER_ITEMS = [
  { slot: "hair", name: "Starter Hair", rarity: "common", price: 120, assetWebpUrl: "/avatar/hair.svg" },
  { slot: "eyebrow", name: "Starter Eyebrow", rarity: "common", price: 60, assetWebpUrl: "/avatar/eyebrow.svg" },
  { slot: "eyes", name: "Starter Eyes", rarity: "common", price: 80, assetWebpUrl: "/avatar/eyes.svg" },
  { slot: "nose", name: "Starter Nose", rarity: "common", price: 50, assetWebpUrl: "/avatar/nose.svg" },
  { slot: "mouth", name: "Starter Mouth", rarity: "common", price: 70, assetWebpUrl: "/avatar/mouth.svg" },
  { slot: "top", name: "Starter Top", rarity: "common", price: 150, assetWebpUrl: "/avatar/top.svg" },
  { slot: "bottom", name: "Starter Bottom", rarity: "common", price: 140, assetWebpUrl: "/avatar/bottom.svg" },
  { slot: "accessory", name: "Starter Accessory", rarity: "common", price: 110, assetWebpUrl: "/avatar/accessory.svg" },
  { slot: "effect", name: "Starter Effect", rarity: "rare", price: 220, assetWebpUrl: "/avatar/effect.svg" }
];

const DEFAULT_WALLET_CREDITS = Number(process.env.DEFAULT_WALLET_CREDITS ?? 1000);

async function seedAvatarItems() {
  for (const item of STARTER_ITEMS) {
    const exists = await prisma.avatarItem.findFirst({
      where: {
        slot: item.slot,
        name: item.name
      }
    });

    if (exists) {
      continue;
    }

    await prisma.avatarItem.create({
      data: {
        slot: item.slot,
        name: item.name,
        rarity: item.rarity,
        price: item.price,
        assetWebpUrl: item.assetWebpUrl,
        assetPngUrl: item.assetWebpUrl,
        isActive: true
      }
    });
  }
}

async function seedWallets() {
  const users = await prisma.user.findMany({
    select: { id: true }
  });

  for (const user of users) {
    await prisma.walletBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        credits: DEFAULT_WALLET_CREDITS
      }
    });
  }
}

async function main() {
  await seedAvatarItems();
  await seedWallets();
  const itemCount = await prisma.avatarItem.count();
  const userCount = await prisma.user.count();
  console.log(`seed complete: items=${itemCount}, users=${userCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
