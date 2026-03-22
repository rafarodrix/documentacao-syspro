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
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na API (${response.status}) ao consultar ${url}. Verifique certificado/permissao.`);
  }

  return response.json();
}

export function SyncTaxButton() {
  const [isPending, startTransition] = useTransition();
  const [lastStatus, setLastStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Sincronizar Agora");

  const handleSync = async () => {
    setLastStatus("idle");
    setStatusMessage("Aguardando Certificado...");

    try {
      setStatusMessage("Consultando classTrib...");
      const classTribData = await fetchSefazRoute(CLASS_TRIB_URL);

      setStatusMessage("Consultando anexos...");
      const anexosData = await fetchSefazRoute(ANEXOS_URL);
      const anexosList = Array.isArray(anexosData) ? anexosData : [anexosData];

      setStatusMessage("Processando dados...");
      const listaParaSalvar = normalizeTaxPayload(classTribData);

      if (listaParaSalvar.length === 0) {
        toast.warning("A API principal retornou dados vazios ou formato desconhecido.");
        setLastStatus("idle");
        setStatusMessage("Sincronizar Agora");
        return;
      }

      startTransition(async () => {
        setStatusMessage("Salvando no banco...");

        const [classTribResult, anexosResult] = await Promise.all([
          saveTaxDataBatch(listaParaSalvar),
          saveTaxAnexosBatch(anexosList),
        ]);

        if (classTribResult.success && anexosResult.success) {
          toast.success(classTribResult.message ?? "Classificacoes sincronizadas.");
          toast.success(anexosResult.message ?? "Anexos sincronizados.");
          setLastStatus("success");
        } else {
          if (!classTribResult.success) {
            toast.error(classTribResult.error ?? "Falha ao salvar classTrib.");
          }
          if (!anexosResult.success) {
            toast.error(anexosResult.error ?? "Falha ao salvar anexos.");
          }
          setLastStatus("error");
        }

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
          Tabelas Fiscais (SEFAZ RS)
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
            <Lock className="h-3 w-3" /> Requer Certificado
          </span>
        </h4>
        <p className="text-xs text-muted-foreground">
          Consulta `classTrib` e `anexos` da SVRS. O navegador solicitara o certificado digital.
        </p>
      </div>

      <Button
        onClick={handleSync}
        disabled={isPending || statusMessage !== "Sincronizar Agora"}
        variant={lastStatus === "error" ? "destructive" : "default"}
        className="min-w-[170px]"
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
