import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export async function GET(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autenticado." }, { status: 401 });
  }
  if (!(await currentUserHasPermission("tax_reform:manage"))) {
    return NextResponse.json({ success: false, error: "Sem permissao." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  const jobs = await prisma.taxSyncJob.findMany({
    where: mode ? { mode } : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      mode: true,
      source: true,
      status: true,
      snapshotVersion: true,
      fetchedAt: true,
      payloadHash: true,
      totalChunks: true,
      currentChunk: true,
      totalItems: true,
      processedItems: true,
      insertedCount: true,
      updatedCount: true,
      unchangedCount: true,
      failedCount: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, jobs });
}
