import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import {
  saveTaxAnexosBatch,
  saveTaxCredPresumidoBatch,
  saveTaxDataBatch,
  saveTaxNcmBatch,
} from "@/actions/tax/tax-actions";

type SyncMode = "classTrib" | "anexos" | "credPresumido" | "ncm";

type SyncChunkBody = {
  mode?: SyncMode;
  chunk?: unknown[];
};

function isSyncMode(value: unknown): value is SyncMode {
  return value === "classTrib" || value === "anexos" || value === "credPresumido" || value === "ncm";
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }

  if (session.role !== Role.ADMIN) {
    return NextResponse.json({ success: false, error: "Sem permissao para sincronizar dados fiscais." }, { status: 403 });
  }

  let body: SyncChunkBody;
  try {
    body = (await request.json()) as SyncChunkBody;
  } catch {
    return NextResponse.json({ success: false, error: "Payload invalido." }, { status: 400 });
  }

  if (!isSyncMode(body.mode)) {
    return NextResponse.json({ success: false, error: "Modo de sincronizacao invalido." }, { status: 400 });
  }

  if (!Array.isArray(body.chunk) || body.chunk.length === 0) {
    return NextResponse.json({ success: false, error: "Chunk vazio." }, { status: 400 });
  }

  const result =
    body.mode === "classTrib"
      ? await saveTaxDataBatch(body.chunk)
      : body.mode === "anexos"
        ? await saveTaxAnexosBatch(body.chunk)
        : body.mode === "credPresumido"
          ? await saveTaxCredPresumidoBatch(body.chunk)
          : await saveTaxNcmBatch(body.chunk);

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
