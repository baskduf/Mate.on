import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../../../lib/db";
import { toDbErrorResponse } from "../../../../../lib/db-error";

export async function GET(
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

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        hostUser: { select: { displayName: true } },
        participants: {
          where: { leftAt: null },
          include: {
            participantUser: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: room.id,
      title: room.title,
      description: room.description,
      hostUserId: room.hostUserId,
      hostDisplayName: room.hostUser.displayName,
      isPublic: room.isPublic,
      hasPassword: Boolean(room.passwordHash),
      maxPlayers: room.maxPlayers,
      isOnline: room.isOnline,
      participants: room.participants.map((p: any) => ({
        userId: p.participantUser.id,
        displayName: p.participantUser.displayName,
      })),
    });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
