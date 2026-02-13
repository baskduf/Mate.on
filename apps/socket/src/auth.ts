import { verifyToken } from "@clerk/backend";

export async function verifyClerkToken(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const payload = await verifyToken(token, {
    secretKey
  });

  return {
    userId: payload.sub
  };
}
