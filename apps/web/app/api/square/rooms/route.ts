import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../../lib/db";
import { ensureDbUser } from "../../../../lib/user";
import { toDbErrorResponse } from "../../../../lib/db-error";

export async function GET(request: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prisma;
  try {
    prisma = await getPrismaClient();
  } catch {
    return NextResponse.json({ error: "Database client not initialized." }, { status: 503 });
  }

  try {
    const user = await ensureDbUser(prisma, clerkUserId);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = Number(url.searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitParam) ? Math.min(50, Math.max(1, limitParam)) : 20;

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { isPublic: true, isOnline: true },
          { hostUserId: user.id },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        hostUser: { select: { displayName: true } },
        _count: {
          select: {
            participants: { where: { leftAt: null } },
          },
        },
      },
    });

    const hasNext = rooms.length > limit;
    const list = hasNext ? rooms.slice(0, limit) : rooms;
    const nextCursor = hasNext ? list[list.length - 1]?.id ?? null : null;

    return NextResponse.json({
      rooms: list.map((room: any) => ({
        id: room.id,
        title: room.title,
        description: room.description,
        hostUserId: room.hostUserId,
        hostDisplayName: room.hostUser.displayName,
        isPublic: room.isPublic,
        hasPassword: Boolean(room.passwordHash),
        playerCount: room._count.participants,
        maxPlayers: room.maxPlayers,
        isOnline: room.isOnline,
        isHost: room.hostUserId === user.id,
      })),
      nextCursor,
    });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
