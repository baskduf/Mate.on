import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../../../../lib/db";
import { ensureDbUser } from "../../../../../../lib/user";
import { toDbErrorResponse } from "../../../../../../lib/db-error";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(
  request: Request,
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
    const body = await request.json().catch(() => ({}));

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: { participants: { where: { leftAt: null } } },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (!room.isOnline) {
      return NextResponse.json({ error: "Room is closed." }, { status: 410 });
    }

    if (room._count.participants >= room.maxPlayers) {
      return NextResponse.json({ error: "Room is full." }, { status: 409 });
    }

    // Password check for private rooms
    if (room.passwordHash) {
      const pw = body.password ? String(body.password) : "";
      const hashed = await hashPassword(pw);
      if (hashed !== room.passwordHash) {
        return NextResponse.json({ error: "Wrong password." }, { status: 403 });
      }
    }

    // Mark any previous active participation as left
    await prisma.roomParticipant.updateMany({
      where: { roomId, participantUserId: user.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    // Create new participation
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId,
        participantUserId: user.id,
      },
    });

    return NextResponse.json({ ok: true, participantId: participant.id });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
