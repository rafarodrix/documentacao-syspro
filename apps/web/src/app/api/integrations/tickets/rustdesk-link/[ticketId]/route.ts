import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  _context: { params: Promise<{ ticketId: string }> }
) {
  return NextResponse.json(
    { success: false, error: "Integracao externa de tickets removida." },
    { status: 410 },
  );
}
