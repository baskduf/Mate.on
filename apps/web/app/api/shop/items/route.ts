import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isEquipSlot } from "../../../../lib/avatar";
import { toDbErrorResponse } from "../../../../lib/db-error";
import { getPrismaClient } from "../../../../lib/db";

interface ShopRow {
  id: string;
  slot: string;
  name: string;
  rarity: string;
  price: number;
  assetWebpUrl: string;
  assetPngUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slot = url.searchParams.get("slot");
  const cursor = url.searchParams.get("cursor");
  const limitParam = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, limitParam)) : 20;

  if (slot && !isEquipSlot(slot)) {
    return NextResponse.json({ error: "Invalid slot filter" }, { status: 400 });
  }

  let prisma;
  try {
    prisma = await getPrismaClient();
  } catch {
    return NextResponse.json({ error: "Database client not initialized. Run npm run db:generate." }, { status: 503 });
  }

  try {
    const rows = (await prisma.avatarItem.findMany({
      where: {
        isActive: true,
        ...(slot ? { slot } : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })) as ShopRow[];

    const hasNext = rows.length > limit;
    const list = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? list[list.length - 1]?.id ?? null : null;

    return NextResponse.json({
      items: list.map((row) => ({
        id: row.id,
        slot: row.slot,
        name: row.name,
        rarity: row.rarity,
        price: row.price,
        assetWebpUrl: row.assetWebpUrl,
        assetPngUrl: row.assetPngUrl,
        isActive: row.isActive
      })),
      nextCursor
    });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
