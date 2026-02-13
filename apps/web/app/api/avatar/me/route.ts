import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AVATAR_ANCHOR, AVATAR_CANVAS, createBaseLayers, isEquipSlot } from "../../../../lib/avatar";
import { toDbErrorResponse } from "../../../../lib/db-error";
import { getPrismaClient } from "../../../../lib/db";
import { ensureDbUser } from "../../../../lib/user";

interface EquipWithItem {
  slot: string;
  itemId: string;
  item: {
    name: string;
    assetWebpUrl: string;
    assetPngUrl: string | null;
  };
}

export async function GET() {
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
      userId,
      canvas: AVATAR_CANVAS,
      anchor: AVATAR_ANCHOR,
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
