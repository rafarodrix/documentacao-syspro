"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { batchReadjustContractsAction } from "@/features/contracts/application/contract-write.actions"
import type { ContractActionResponse } from "@/features/contracts/domain/contract.types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
} from "@dosc-syspro/ui";
import { RefreshCw, AlertTriangle, Loader2, DollarSign, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrencyBRL } from "@dosc-syspro/shared"

export function BulkReadjustDialog() {
  const [open, setOpen] = useState(false)
  const [newValue, setNewValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ affected: number } | null>(null)

  const parsed = parseFloat(newValue.replace(",", "."))
  const isValid = !isNaN(parsed) && parsed > 0

  const handleReadjust = () => {
    if (!isValid) {
      toast.error("Digite um valor valido.")
      return
    }

    startTransition(async () => {
      const res: ContractActionResponse<{ affected: number }> = await batchReadjustContractsAction(parsed)

      if (!res.success) {
        toast.error(res.error ?? "Erro ao aplicar reajuste.")
        return
      }

      setResult({ affected: res.data.affected ?? 0 })
    })
  }

  const handleClose = () => {
    setOpen(false)
    setNewValue("")
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reajuste em Massa
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </div>
          <DialogTitle>Reajuste Global</DialogTitle>
          <DialogDescription>
            Atualiza o salario base de todos os contratos ativos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {result ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Reajuste aplicado</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{result.affected}</span> contrato{result.affected !== 1 ? "s" : ""} atualizado{result.affected !== 1 ? "s" : ""} para{" "}
                  <span className="font-mono font-medium text-emerald-600">{formatCurrencyBRL(parsed)}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Novo salario minimo
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newValue}
                    onChange={(event) => setNewValue(event.target.value)}
                    className="h-11 pl-9 text-lg font-mono"
                  />
                </div>
                {isValid ? (
                  <p className="text-xs text-muted-foreground">
                    Novo valor: <span className="font-mono font-medium text-foreground">{formatCurrencyBRL(parsed)}</span>
                  </p>
                ) : null}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Aplicado apenas a contratos com status <span className="font-medium text-emerald-600">Ativo</span>. Contratos suspensos ou cancelados nao serao alterados.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
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
                className={cn("flex-1 bg-amber-600 text-white hover:bg-amber-700", isPending && "opacity-80")}
              >
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Confirmar Reajuste"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
