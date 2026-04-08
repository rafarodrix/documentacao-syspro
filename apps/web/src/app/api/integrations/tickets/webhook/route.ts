import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Endpoint descontinuado: integracao de tickets removida." }, { status: 410 });
}
