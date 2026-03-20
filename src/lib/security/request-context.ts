import { headers } from "next/headers";

export async function getRequestIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for") ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    null
  );
}

