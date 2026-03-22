import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
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
  chunkIndex?: number;
  totalChunks?: number;
  totalItems?: number;
  source?: string;
  fetchedAt?: number;
  jobId?: string;
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

  const chunkIndex = typeof body.chunkIndex === "number" ? body.chunkIndex : 0;
  const totalChunks = typeof body.totalChunks === "number" ? body.totalChunks : 1;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const totalItems = typeof body.totalItems === "number" ? body.totalItems : body.chunk.length;

  let jobId = body.jobId;
  if (!jobId) {
    const snapshotVersion = `${body.mode}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const created = await prisma.taxSyncJob.create({
      data: {
        mode: body.mode,
        source: body.source ?? null,
        status: "RUNNING",
        snapshotVersion,
        fetchedAt: typeof body.fetchedAt === "number" ? new Date(body.fetchedAt) : new Date(),
        totalChunks,
        totalItems,
        startedAt: new Date(),
      },
      select: { id: true },
    });
    jobId = created.id;
  }

  const result =
    body.mode === "classTrib"
      ? await saveTaxDataBatch(body.chunk, {
          revalidate: isLastChunk,
        })
      : body.mode === "anexos"
        ? await saveTaxAnexosBatch(body.chunk, {
            isFirstChunk: chunkIndex === 0,
            revalidate: isLastChunk,
          })
        : body.mode === "credPresumido"
          ? await saveTaxCredPresumidoBatch(body.chunk, {
              isFirstChunk: chunkIndex === 0,
              revalidate: isLastChunk,
            })
          : await saveTaxNcmBatch(body.chunk, {
              revalidate: isLastChunk,
            });

  if (!result.success) {
    if (jobId) {
      await prisma.taxSyncJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: result.error ?? "Falha na sincronizacao.",
          finishedAt: new Date(),
          failedCount: { increment: body.chunk.length },
        },
      });
    }
    return NextResponse.json(result, { status: 500 });
  }

  const chunkHash = createHash("sha1").update(JSON.stringify(body.chunk)).digest("hex");
  const previous = await prisma.taxSyncJob.findUnique({
    where: { id: jobId },
    select: { payloadHash: true },
  });
  const mergedHash = createHash("sha1")
    .update(`${previous?.payloadHash ?? ""}|${chunkHash}`)
    .digest("hex");

  await prisma.taxSyncJob.update({
    where: { id: jobId },
    data: {
      currentChunk: chunkIndex + 1,
      processedItems: { increment: body.chunk.length },
      insertedCount: { increment: result.inserted ?? 0 },
      updatedCount: { increment: result.updated ?? 0 },
      unchangedCount: { increment: result.unchanged ?? 0 },
      failedCount: { increment: result.failed ?? 0 },
      payloadHash: mergedHash,
      ...(isLastChunk
        ? {
            status: "SUCCESS",
            finishedAt: new Date(),
          }
        : {}),
    },
  });

  return NextResponse.json({
    ...result,
    jobId,
  });
}
