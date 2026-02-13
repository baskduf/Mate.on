import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createBaseLayers, isEquipSlot } from "../../../../lib/avatar";
import { toDbErrorResponse } from "../../../../lib/db-error";
import { getPrismaClient } from "../../../../lib/db";
import { ensureDbUser } from "../../../../lib/user";

const STARTER_SLOT_ORDER = ["hair", "eyebrow", "eyes", "nose", "mouth", "top", "bottom", "accessory", "effect"] as const;

interface StarterItem {
  id: string;
  slot: string;
}

interface EquipWithItem {
  slot: string;
  itemId: string;
  item: {
    name: string;
    assetWebpUrl: string;
    assetPngUrl: string | null;
  };
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prisma;
  try {
    prisma = await getPrismaClient();
  } catch {
    return NextResponse.json({ error: "Database client not initialized. Run npm run db:generate." }, { status: 503 });
  }

  try {
    const dbUser = await ensureDbUser(prisma, userId);

    const existingItem = await prisma.inventoryItem.findFirst({
      where: { userId: dbUser.id },
      select: { id: true }
    });

    if (existingItem) {
      return NextResponse.json({ error: "Avatar already created" }, { status: 409 });
    }

    const starterCandidates = (await prisma.avatarItem.findMany({
      where: {
        isActive: true,
        slot: {
          in: [...STARTER_SLOT_ORDER]
        }
      },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }]
    })) as StarterItem[];

    const starterBySlot = new Map<string, StarterItem>();
    for (const item of starterCandidates) {
      if (!starterBySlot.has(item.slot)) {
        starterBySlot.set(item.slot, item);
      }
    }

    const starterItems = STARTER_SLOT_ORDER.map((slot) => starterBySlot.get(slot)).filter(
      (item): item is StarterItem => Boolean(item)
    );

    if (starterItems.length !== STARTER_SLOT_ORDER.length) {
      return NextResponse.json({ error: "Starter items are not available." }, { status: 503 });
    }

    await prisma.$transaction(async (tx: any) => {
      for (const item of starterItems) {
        await tx.inventoryItem.create({
          data: {
            userId: dbUser.id,
            itemId: item.id
          }
        });

        await tx.avatarEquip.upsert({
          where: {
            userId_slot: {
              userId: dbUser.id,
              slot: item.slot
            }
          },
          update: { itemId: item.id },
          create: {
            userId: dbUser.id,
            slot: item.slot,
            itemId: item.id
          }
        });
      }
    });

    const equips = (await prisma.avatarEquip.findMany({
      where: { userId: dbUser.id },
      include: { item: true }
    })) as EquipWithItem[];

    const layers = createBaseLayers();
    for (const equip of equips) {
      if (isEquipSlot(equip.slot)) {
        layers[equip.slot] = equip.item.assetWebpUrl || equip.item.assetPngUrl;
      }
    }

    return NextResponse.json({
      ok: true,
      layers,
      equipped: equips.map((equip) => ({
        slot: equip.slot,
        itemId: equip.itemId,
        name: equip.item.name
      }))
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Avatar already created" }, { status: 409 });
    }
    return toDbErrorResponse(error);
  }
}
