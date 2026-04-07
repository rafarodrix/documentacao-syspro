import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: false, error: "Endpoint descontinuado: integracao Zammad removida." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: "Endpoint descontinuado: integracao Zammad removida." }, { status: 410 });
}
