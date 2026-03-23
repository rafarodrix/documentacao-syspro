import crypto from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

type RevalidateScope = "releases" | "tickets" | "all";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function extractToken(request: Request): string {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("secret") ?? "";
  const headerToken = request.headers.get("x-revalidate-token") ?? "";
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  return headerToken || bearerToken || queryToken;
}

function normalizeScope(raw: unknown): RevalidateScope {
  if (raw === "tickets" || raw === "all") return raw;
  return "releases";
}

export async function POST(request: Request) {
  const expectedToken = process.env.REVALIDATE_TOKEN ?? "";
  const receivedToken = extractToken(request);

  if (!expectedToken || !receivedToken || !safeEqual(receivedToken, expectedToken)) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ticketId = body?.ticket_id ? String(body.ticket_id) : null;
    const scope = normalizeScope(body?.scope);
    const revalidatedPaths: string[] = [];
    const revalidatedTags: string[] = [];

    if (scope === "releases" || scope === "all") {
      revalidateTag("releases");
      revalidatePath("/releases");
      revalidatedTags.push("releases");
      revalidatedPaths.push("/releases");
    }

    if (scope === "tickets" || scope === "all") {
      revalidateTag("tickets-list");
      revalidateTag("tickets-dashboard");
      revalidatePath("/app");
      revalidatePath("/app/chamados");
      revalidatedTags.push("tickets-list", "tickets-dashboard");
      revalidatedPaths.push("/app", "/app/chamados");
      if (ticketId) {
        revalidatePath(`/app/chamados/${ticketId}`);
        revalidatedPaths.push(`/app/chamados/${ticketId}`);
      }
    }

    return NextResponse.json({
      revalidated: true,
      scope,
      tags: revalidatedTags,
      paths: revalidatedPaths,
      now: Date.now(),
    });
  } catch (err) {
    console.error("Erro ao revalidar cache:", err);
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}

