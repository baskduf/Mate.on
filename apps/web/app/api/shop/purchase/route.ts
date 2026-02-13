import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { toDbErrorResponse } from "../../../../lib/db-error";
import { getPrismaClient } from "../../../../lib/db";
import { DEFAULT_WALLET_CREDITS, ensureDbUser } from "../../../../lib/user";

interface PurchaseBody {
  itemId?: string;
}

const INSUFFICIENT_CREDITS_CODE = "INSUFFICIENT_CREDITS";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PurchaseBody;
  if (!body.itemId) {
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
        isActive: true
      }
    });

    if (!item) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }

    const alreadyOwned = await prisma.inventoryItem.findFirst({
      where: {
        userId: dbUser.id,
        itemId: item.id
      }
    });

    if (alreadyOwned) {
      return NextResponse.json({ error: "Item already owned" }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.walletBalance.findUnique({
        where: { userId: dbUser.id }
      });

      const credits = wallet?.credits ?? DEFAULT_WALLET_CREDITS;
      if (credits < item.price) {
        const err = new Error(INSUFFICIENT_CREDITS_CODE);
        throw err;
      }

      const updatedWallet = await tx.walletBalance.update({
        where: { userId: dbUser.id },
        data: {
          credits: {
            decrement: item.price
          }
        }
      });

      const ownedItem = await tx.inventoryItem.create({
        data: {
          userId: dbUser.id,
          itemId: item.id
        }
      });

      await tx.purchaseLog.create({
        data: {
          userId: dbUser.id,
          itemId: item.id,
          amount: item.price
        }
      });

      return {
        remainingCredits: updatedWallet.credits,
        inventoryId: ownedItem.id
      };
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        slot: item.slot,
        name: item.name,
        rarity: item.rarity,
        price: item.price,
        assetWebpUrl: item.assetWebpUrl,
        assetPngUrl: item.assetPngUrl
      },
      inventoryId: result.inventoryId,
      remainingCredits: result.remainingCredits
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

    if (message.includes(INSUFFICIENT_CREDITS_CODE)) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    if (code === "P2002") {
      return NextResponse.json({ error: "Item already owned" }, { status: 409 });
    }

    return toDbErrorResponse(error);
  }
}
