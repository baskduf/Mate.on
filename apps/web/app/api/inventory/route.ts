import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { toDbErrorResponse } from "../../../lib/db-error";
import { getPrismaClient } from "../../../lib/db";
import { DEFAULT_WALLET_CREDITS, ensureDbUser } from "../../../lib/user";

interface InventoryRow {
  id: string;
  acquiredAt: string;
  itemId: string;
  item: {
    id: string;
    slot: string;
    name: string;
    rarity: string;
    price: number;
    assetWebpUrl: string;
    assetPngUrl: string | null;
    isActive: boolean;
  };
}

interface EquipRow {
  slot: string;
  itemId: string;
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

    const [wallet, inventoryRows, equipRows] = await Promise.all([
      prisma.walletBalance.findUnique({ where: { userId: dbUser.id } }),
      prisma.inventoryItem.findMany({
        where: { userId: dbUser.id },
        include: { item: true },
        orderBy: { acquiredAt: "desc" }
      }),
      prisma.avatarEquip.findMany({
        where: { userId: dbUser.id }
      })
    ]);

    const equippedItemIds = new Set((equipRows as EquipRow[]).map((row) => row.itemId));
    const equippedBySlot = Object.fromEntries((equipRows as EquipRow[]).map((row) => [row.slot, row.itemId]));

    return NextResponse.json({
      userId,
      credits: wallet?.credits ?? DEFAULT_WALLET_CREDITS,
      equippedBySlot,
      items: (inventoryRows as InventoryRow[]).map((row) => ({
        inventoryId: row.id,
        acquiredAt: row.acquiredAt,
        equipped: equippedItemIds.has(row.itemId),
        item: {
          id: row.item.id,
          slot: row.item.slot,
          name: row.item.name,
          rarity: row.item.rarity,
          price: row.item.price,
          assetWebpUrl: row.item.assetWebpUrl,
          assetPngUrl: row.item.assetPngUrl,
          isActive: row.item.isActive
        }
      }))
    });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
