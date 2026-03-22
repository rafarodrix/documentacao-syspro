"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { saveTaxAnexosBatch, saveTaxDataBatch } from "@/actions/tax/tax-actions";
import { toast } from "sonner";

const CLASS_TRIB_URL = "https://cff.svrs.rs.gov.br/api/v1/consultas/classTrib";
const ANEXOS_URL = "https://cff.svrs.rs.gov.br/api/v1/consultas/anexos";

function normalizeTaxPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const objectData = data as Record<string, unknown>;

    if (Array.isArray(objectData.resultado)) return objectData.resultado;
    if (objectData.CST) return [objectData];
  }

  return [data];
}

async function fetchSefazRoute(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Erro na API (${response.status}) ao consultar ${url}. Verifique certificado/permissao.`);
  }

  return response.json();
}

function splitByApproxSize<T>(items: T[], maxBytes: number): T[][] {
  if (!items.length) return [];

  const chunks: T[][] = [];
  let currentChunk: T[] = [];
  let currentSize = 0;

  for (const item of items) {
    const json = JSON.stringify(item);
    const itemSize = new TextEncoder().encode(json).length;

    if (currentChunk.length > 0 && currentSize + itemSize > maxBytes) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentSize = itemSize;
      continue;
    }

    currentChunk.push(item);
    currentSize += itemSize;
  }

  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

type SyncMode = "classTrib" | "anexos";

function SyncRouteButton({ mode }: { mode: SyncMode }) {
  const [isPending, startTransition] = useTransition();
  const [lastStatus, setLastStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Sincronizar Agora");

  const isClassTrib = mode === "classTrib";
  const routeUrl = isClassTrib ? CLASS_TRIB_URL : ANEXOS_URL;

  const title = isClassTrib ? "Classificacoes Tributarias (classTrib)" : "Anexos Fiscais (anexos)";
  const subtitle = isClassTrib
    ? "Sincroniza CST + cClassTrib em lotes para evitar limite de 1MB."
    : "Sincroniza anexos oficiais em lotes para evitar limite de 1MB.";

  const handleSync = async () => {
    setLastStatus("idle");
    setStatusMessage("Aguardando Certificado...");

    try {
      setStatusMessage("Consultando rota...");
      const rawData = await fetchSefazRoute(routeUrl);
      const list = isClassTrib ? normalizeTaxPayload(rawData) : (Array.isArray(rawData) ? rawData : [rawData]);

      if (list.length === 0) {
        toast.warning("A API retornou dados vazios.");
        setStatusMessage("Sincronizar Agora");
        return;
      }

      const maxBytes = isClassTrib ? 450_000 : 350_000;
      const chunks = splitByApproxSize(list, maxBytes);

      startTransition(async () => {
        let total = 0;

        for (let i = 0; i < chunks.length; i++) {
          setStatusMessage(`Salvando lote ${i + 1}/${chunks.length}...`);

          const result = isClassTrib
            ? await saveTaxDataBatch(chunks[i] as unknown[])
            : await saveTaxAnexosBatch(chunks[i] as unknown[]);

          if (!result.success) {
            toast.error(result.error ?? "Falha ao sincronizar lote.");
            setLastStatus("error");
            setStatusMessage("Falha na Sincronizacao");
            return;
          }

          total += chunks[i].length;
        }

        toast.success(`${title}: ${total} registro(s) processado(s) em ${chunks.length} lote(s).`);
        setLastStatus("success");
        setStatusMessage("Sincronizacao concluida");

        setTimeout(() => {
          setLastStatus("idle");
          setStatusMessage("Sincronizar Agora");
        }, 3000);
      });
    } catch (error: any) {
      console.error("Erro no Sync:", error);
      const msg = error?.message?.includes("Failed to fetch")
        ? "Falha na conexao. O certificado foi negado ou houve bloqueio de CORS."
        : error?.message ?? "Erro inesperado ao sincronizar dados fiscais.";

      toast.error(msg);
      setLastStatus("error");
      setStatusMessage("Falha na Conexao");

      setTimeout(() => {
        setLastStatus("idle");
        setStatusMessage("Sincronizar Agora");
      }, 3000);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/10 p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <RefreshCw className={`h-5 w-5 ${isPending || statusMessage !== "Sincronizar Agora" ? "animate-spin" : ""}`} />
      </div>

      <div className="flex-1">
        <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
          {title}
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
            <Lock className="h-3 w-3" /> Requer Certificado
          </span>
        </h4>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">Rota: {routeUrl}</p>
      </div>

      <Button
        onClick={handleSync}
        disabled={isPending || statusMessage !== "Sincronizar Agora"}
        variant={lastStatus === "error" ? "destructive" : "default"}
        className="min-w-[185px]"
      >
        {statusMessage === "Sincronizar Agora" ? (
          "Sincronizar Agora"
        ) : lastStatus === "success" ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Sucesso
          </>
        ) : lastStatus === "error" ? (
          <>
            <AlertTriangle className="mr-2 h-4 w-4" /> Erro
          </>
        ) : (
          statusMessage
        )}
      </Button>
    </div>
  );
}

export function SyncTaxClassTribButton() {
  return <SyncRouteButton mode="classTrib" />;
}

export function SyncTaxAnexosButton() {
  return <SyncRouteButton mode="anexos" />;
}

// Compatibilidade com uso antigo
export function SyncTaxButton() {
  return (
    <div className="space-y-3">
      <SyncTaxClassTribButton />
      <SyncTaxAnexosButton />
    </div>
  );
}
