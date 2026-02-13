import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const authState = await auth();

  if (!authState.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await authState.getToken();
  if (!token) {
    return NextResponse.json({ error: "Unable to create session token" }, { status: 503 });
  }

  return NextResponse.json({
    userId: authState.userId,
    token
  });
}
