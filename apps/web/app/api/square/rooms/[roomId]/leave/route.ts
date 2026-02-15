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

    // Mark all active participations in this room as left
    await prisma.roomParticipant.updateMany({
      where: {
        roomId,
        participantUserId: user.id,
        leftAt: null,
      },
      data: { leftAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
