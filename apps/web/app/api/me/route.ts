import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrismaClient } from "../../../lib/db";
import { ensureDbUser } from "../../../lib/user";

export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = await getPrismaClient();
    const user = await ensureDbUser(prisma, clerkUserId);
    return NextResponse.json({
      userId: user.id,
      clerkUserId,
      displayName: user.displayName,
    });
  } catch {
    return NextResponse.json({ userId: clerkUserId });
  }
}
