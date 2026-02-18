"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { saveTaxDataBatch } from "@/actions/tax/tax-actions";
import { toast } from "sonner";

export function SyncTaxButton() {
    const [isPending, startTransition] = useTransition();
    const [lastStatus, setLastStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("Sincronizar Agora");

    const handleSync = async () => {
        // 1. Limpa status anterior
        setLastStatus("idle");
        setStatusMessage("Aguardando Certificado...");

        try {
            // 2. FETCH CLIENT-SIDE: O navegador vai abrir o popup de certificado aqui
            // A URL é a da SEFAZ RS que você passou
            const response = await fetch("https://cff.svrs.rs.gov.br/api/v1/consultas/classTrib", {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
                // O navegador gerencia o certificado automaticamente ao detectar a exigência do servidor
            });

            if (!response.ok) {
                throw new Error(`Erro na API (${response.status}): Verifique se o certificado foi selecionado.`);
            }

            setStatusMessage("Processando dados...");
            const data = await response.json();

            console.log("Dados recebidos da SEFAZ:", data);

            // A API retorna um objeto ou array? Vamos garantir que enviamos um array para a Action
            let listaParaSalvar = [];

            if (Array.isArray(data)) {
                listaParaSalvar = data;
            } else if (data.resultado) {
                // Algumas APIs retornam { resultado: [...] }
                listaParaSalvar = data.resultado;
            } else if (data.CST) {
                // Se retornar um único objeto CST (como no seu exemplo JSON), colocamos num array
                listaParaSalvar = [data];
            } else {
                // Fallback genérico
                listaParaSalvar = [data];
            }

            if (listaParaSalvar.length === 0) {
                toast.warning("A API retornou dados vazios ou formato desconhecido.");
                setLastStatus("idle");
                setStatusMessage("Sincronizar Agora");
                return;
            }

            // 3. SERVER ACTION: Envia os dados baixados para salvar no banco
            startTransition(async () => {
                setStatusMessage("Salvando no banco...");

                // Chama a função correta 'saveTaxDataBatch'
                const result = await saveTaxDataBatch(listaParaSalvar);

                if (result.success) {
                    toast.success(result.message);
                    setLastStatus("success");
                } else {
                    toast.error(result.error);
                    setLastStatus("error");
                }

                // Reset visual após 3s
                setTimeout(() => {
                    setLastStatus("idle");
                    setStatusMessage("Sincronizar Agora");
                }, 3000);
            });

        } catch (error: any) {
            console.error("Erro no Sync:", error);
            // Mensagem amigável se for erro de conexão/certificado
            const msg = error.message.includes("Failed to fetch")
                ? "Falha na conexão. O certificado foi negado ou bloqueio de CORS."
                : error.message;

            toast.error(msg);
            setLastStatus("error");
            setStatusMessage("Falha na Conexão");

            setTimeout(() => {
                setLastStatus("idle");
                setStatusMessage("Sincronizar Agora");
            }, 3000);
        }
    };

    return (
        <div className="flex items-center gap-4 p-4 border border-border/50 rounded-xl bg-muted/10">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <RefreshCw className={`h-5 w-5 ${isPending || statusMessage !== "Sincronizar Agora" ? "animate-spin" : ""}`} />
            </div>

            <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    Tabelas Fiscais (SEFAZ RS)
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Requer Certificado
                    </span>
                </h4>
                <p className="text-xs text-muted-foreground">
                    O navegador solicitará seu certificado digital para baixar os dados.
                </p>
            </div>

            <Button
                onClick={handleSync}
                disabled={isPending || statusMessage !== "Sincronizar Agora"}
                variant={lastStatus === "error" ? "destructive" : "default"}
                className="min-w-[160px]"
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