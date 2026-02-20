// src/components/platform/app/contratos/BulkReadjustDialog.tsx
"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { batchReadjustContractsAction } from "@/actions/admin/contract-actions"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, AlertTriangle, Loader2, DollarSign, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrencyBRL } from "@/core/shared/utils/currency-utils"

export function BulkReadjustDialog() {
  const [open, setOpen] = useState(false)
  const [newValue, setNewValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ affected: number } | null>(null)

  const parsed = parseFloat(newValue.replace(",", "."))
  const isValid = !isNaN(parsed) && parsed > 0

  const handleReadjust = () => {
    if (!isValid) {
      toast.error("Digite um valor válido.")
      return
    }

    startTransition(async () => {
      const res = await batchReadjustContractsAction(parsed) as any

      if (res.success) {
        setResult({ affected: res.affected ?? 0 })
      } else {
        toast.error(res.error ?? "Erro ao aplicar reajuste.")
      }
    })
  }

  const handleClose = () => {
    setOpen(false)
    setNewValue("")
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/40 text-muted-foreground transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Reajuste em Massa
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden border-none shadow-2xl">

        {/* Cabeçalho */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 text-center">
          <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3 ring-4 ring-amber-50 dark:ring-amber-900/10">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
          <DialogTitle className="text-lg font-semibold">Reajuste Global</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-amber-900/70 dark:text-amber-200/70">
            Atualiza o <strong>Salário Base</strong> de todos os contratos ativos.
          </DialogDescription>
        </div>

        <div className="p-6 bg-background">
          {result ? (
            // --- Estado de Sucesso -----------------------------------------
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Reajuste aplicado!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="text-foreground font-medium">{result.affected}</span> contrato{result.affected !== 1 ? "s" : ""} atualizado{result.affected !== 1 ? "s" : ""} para{" "}
                  <span className="font-mono font-medium text-emerald-600">{formatCurrencyBRL(parsed)}</span>
                </p>
              </div>
            </div>
          ) : (
            // --- Formulário ------------------------------------------------
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                  Novo Salário Mínimo
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="pl-9 h-11 text-lg font-mono"
                  />
                </div>
                {isValid && (
                  <p className="text-xs text-muted-foreground">
                    Novo valor:{" "}
                    <span className="font-mono font-medium text-foreground">{formatCurrencyBRL(parsed)}</span>
                  </p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Aplicado apenas a contratos com status{" "}
                <span className="text-emerald-600 font-medium">Ativo</span>. Contratos suspensos ou cancelados não serão alterados.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-5 border-t border-border/50 bg-muted/20">
          {result ? (
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          ) : (
            <div className="flex w-full gap-3">
              <Button variant="ghost" onClick={handleClose} disabled={isPending} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleReadjust}
                disabled={isPending || !isValid}
                className={cn(
                  "flex-1 bg-amber-600 hover:bg-amber-700 text-white",
                  isPending && "opacity-80"
                )}
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando...</>
                  : "Confirmar Reajuste"
                }
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}