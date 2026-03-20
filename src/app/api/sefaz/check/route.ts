import { NextResponse } from "next/server";
import { SefazService } from "@/app/api/sefaz/sefaz.service";
import { isValidSecretToken } from "@/lib/security/request-auth";

function isAuthorized(request: Request): boolean {
  const expected = process.env.SEFAZ_CHECK_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!expected) return false;
  return isValidSecretToken(request, expected, {
    headerName: "x-sefaz-check-secret",
    queryName: "secret",
    allowBearer: true,
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  const service = new SefazService();
  const result = await service.runFullCheck();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
  }

  const service = new SefazService();
  const result = await service.runFullCheck();
  return NextResponse.json({ ok: true, ...result });
}
