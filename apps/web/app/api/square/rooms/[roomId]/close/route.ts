import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../../../../lib/db";
import { ensureDbUser } from "../../../../../../lib/user";
import { toDbErrorResponse } from "../../../../../../lib/db-error";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
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
    const { roomId } = await params;
    const user = await ensureDbUser(prisma, clerkUserId);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.hostUserId !== user.id) {
      return NextResponse.json({ error: "Only the host can close this room." }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.roomParticipant.updateMany({
        where: { roomId, leftAt: null },
        data: { leftAt: new Date() },
      }),
      prisma.room.update({
        where: { id: roomId },
        data: { isOnline: false },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
