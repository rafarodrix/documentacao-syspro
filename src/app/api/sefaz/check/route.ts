import { NextResponse } from "next/server";
import { SefazService } from "@/app/api/sefaz/sefaz.service";

function isAuthorized(secret: string | null): boolean {
  const expected = process.env.SEFAZ_CHECK_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!expected) return false;
  return secret === expected;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!isAuthorized(secret)) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  const service = new SefazService();
  const result = await service.runFullCheck();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!isAuthorized(secret)) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  const service = new SefazService();
  const result = await service.runFullCheck();
  return NextResponse.json({ ok: true, ...result });
}
