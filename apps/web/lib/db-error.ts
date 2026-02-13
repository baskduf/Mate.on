import { NextResponse } from "next/server";

export function toDbErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const isNetworkError =
    message.includes("Can't reach database server") || message.includes("empty host in database URL");

  if (isNetworkError) {
    return NextResponse.json(
      {
        error:
          "Database unreachable. Use Supabase pooler (IPv4) URL for DATABASE_URL, then restart dev server."
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: "Database query failed.",
      detail: process.env.NODE_ENV === "production" ? undefined : message || code || "unknown"
    },
    { status: 500 }
  );
}
