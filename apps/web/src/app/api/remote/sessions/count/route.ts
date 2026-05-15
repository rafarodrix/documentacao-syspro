import { NextResponse } from "next/server";
import { trpc } from "@/lib/api/trpc-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await trpc.remote.sessions.query({ status: "ACTIVE", page: 1, pageSize: 1 });
    return NextResponse.json({ count: result.pagination.total });
  } catch {
    return new Response("Nao autorizado", { status: 401 });
  }
}
