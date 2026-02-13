import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createBaseLayers, isEquipSlot } from "../../../../lib/avatar";
import { toDbErrorResponse } from "../../../../lib/db-error";
import { getPrismaClient } from "../../../../lib/db";
import { ensureDbUser } from "../../../../lib/user";

interface EquipBody {
  slot?: string;
  itemId?: string;
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

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EquipBody;

  if (!body.slot || !body.itemId || !isEquipSlot(body.slot)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let prisma;
  try {
    prisma = await getPrismaClient();
  } catch {
    return NextResponse.json({ error: "Database client not initialized. Run npm run db:generate." }, { status: 503 });
  }
  try {
    const dbUser = await ensureDbUser(prisma, userId);

    const item = await prisma.avatarItem.findFirst({
      where: {
        id: body.itemId,
        slot: body.slot,
        isActive: true
      }
    });

    if (!item) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }

    const ownership = await prisma.inventoryItem.findFirst({
      where: {
        userId: dbUser.id,
        itemId: body.itemId
      }
    });

    if (!ownership) {
      return NextResponse.json({ error: "Item not owned" }, { status: 403 });
    }

    await prisma.avatarEquip.upsert({
      where: {
        userId_slot: {
          userId: dbUser.id,
          slot: body.slot
        }
      },
      update: { itemId: body.itemId },
      create: {
        userId: dbUser.id,
        slot: body.slot,
        itemId: body.itemId
      }
    });

    const equips = (await prisma.avatarEquip.findMany({
      where: { userId: dbUser.id },
      include: { item: true }
    })) as EquipWithItem[];

    const layers = createBaseLayers();

    for (const equip of equips) {
      const slot = String(equip.slot);
      if (isEquipSlot(slot)) {
        layers[slot] = equip.item.assetWebpUrl || equip.item.assetPngUrl;
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
    return toDbErrorResponse(error);
  }
}
