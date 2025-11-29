"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { batchReadjustContractsAction } from "@/actions/admin/contract-actions";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, AlertTriangle, Loader2, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function BulkReadjustDialog() {
    const [open, setOpen] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleReadjust = () => {
        const wage = parseFloat(newValue);
        if (!wage || wage <= 0) {
            toast.error("Digite um valor válido.");
            return;
        }

        startTransition(async () => {
            const result = await batchReadjustContractsAction(wage);
            if (result.success) {
                toast.success(result.message);
                setOpen(false);
                setNewValue("");
            } else {
                toast.error(result.error);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/40 text-muted-foreground transition-all shadow-sm"
                >
                    <RefreshCw className="h-4 w-4" />
                    Reajuste em Massa
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden border-none shadow-2xl">
                {/* Cabeçalho Estilizado */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 ring-4 ring-amber-50 dark:ring-amber-900/10">
                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                        Reajuste Global
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-amber-900/70 dark:text-amber-200/70 text-sm max-w-[85%]">
                        Esta ação atualizará o <strong>Salário Base</strong> de todos os contratos ativos imediatamente.
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6 bg-background">
                    {/* Input Principal */}
                    <div className="space-y-3">
                        <Label htmlFor="new-wage" className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Novo Salário Mínimo
                        </Label>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground group-focus-within:bg-amber-100 group-focus-within:text-amber-600 transition-colors">
                                <DollarSign className="h-3 w-3" />
                            </div>
                            <Input
                                id="new-wage"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="pl-10 h-11 text-lg font-mono bg-muted/30 border-muted-foreground/20 focus:border-amber-500/50 focus:ring-amber-500/20 transition-all"
                            />
                            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity">
                                <TrendingUp className="h-3 w-3" />
                                <span>Atualizar</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            O novo valor será aplicado apenas a contratos com status <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Active</span>
                        </p>
                    </div>
                </div>

                <DialogFooter className="bg-muted/30 p-6 border-t border-border/50 sm:justify-between items-center">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleReadjust}
                        disabled={isPending || !newValue}
                        className={cn(
                            "bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all",
                            isPending ? "opacity-80" : "hover:shadow-amber-500/25 hover:scale-[1.02]"
                        )}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando...
                            </>
                        ) : (
                            "Confirmar Reajuste"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}