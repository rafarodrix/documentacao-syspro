"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { syncTaxClassificationsAction } from "@/actions/tax/tax-actions";
import { toast } from "sonner";

export function SyncTaxButton() {
    const [isPending, startTransition] = useTransition();
    const [lastStatus, setLastStatus] = useState<"idle" | "success" | "error">("idle");

    const handleSync = () => {
        startTransition(async () => {
            const result = await syncTaxClassificationsAction();

            if (result.success) {
                toast.success(result.message);
                setLastStatus("success");
            } else {
                toast.error(result.error);
                setLastStatus("error");
            }

            // Reset status visual após 3s
            setTimeout(() => setLastStatus("idle"), 3000);
        });
    };

    return (
        <div className="flex items-center gap-4 p-4 border border-border/50 rounded-xl bg-muted/10">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <RefreshCw className={`h-5 w-5 ${isPending ? "animate-spin" : ""}`} />
            </div>

            <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">Tabelas Fiscais (API)</h4>
                <p className="text-xs text-muted-foreground">
                    Sincronizar cClassTrib e CST com a base oficial.
                </p>
            </div>

            <Button
                onClick={handleSync}
                disabled={isPending}
                variant={lastStatus === "error" ? "destructive" : "default"}
                className="min-w-[120px]"
            >
                {isPending ? (
                    "Sincronizando..."
                ) : lastStatus === "success" ? (
                    <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Atualizado
                    </>
                ) : lastStatus === "error" ? (
                    <>
                        <AlertTriangle className="mr-2 h-4 w-4" /> Falhou
                    </>
                ) : (
                    "Sincronizar Agora"
                )}
            </Button>
        </div>
    );
}