import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../../../lib/db";
import { ensureDbUser } from "../../../../../lib/user";
import { toDbErrorResponse } from "../../../../../lib/db-error";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
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
    const body = await request.json();

    const title = String(body.title ?? "").trim();
    if (!title || title.length > 50) {
      return NextResponse.json({ error: "Title must be 1-50 characters." }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim().slice(0, 200) : null;
    const isPublic = body.isPublic !== false;
    const maxPlayers = Math.min(50, Math.max(2, Number(body.maxPlayers) || 20));

    let passwordHash: string | null = null;
    if (!isPublic && body.password) {
      const pw = String(body.password);
      if (pw.length < 1 || pw.length > 30) {
        return NextResponse.json({ error: "Password must be 1-30 characters." }, { status: 400 });
      }
      passwordHash = await hashPassword(pw);
    }

    const room = await prisma.room.create({
      data: {
        hostUserId: user.id,
        title,
        description,
        isPublic,
        passwordHash,
        maxPlayers,
        isOnline: true,
      },
    });

    return NextResponse.json({
      room: {
        id: room.id,
        title: room.title,
        description: room.description,
        isPublic: room.isPublic,
        maxPlayers: room.maxPlayers,
        isOnline: room.isOnline,
      },
    });
  } catch (error) {
    return toDbErrorResponse(error);
  }
}
