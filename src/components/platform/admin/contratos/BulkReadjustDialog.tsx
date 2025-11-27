"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { batchReadjustContractsAction } from "@/app/(platform)/admin/_actions/contract-actions";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

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
                <Button variant="outline" className="gap-2 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 text-muted-foreground">
                    <RefreshCw className="h-4 w-4" />
                    Reajuste em Massa
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" /> Reajuste Global de Salário
                    </DialogTitle>
                    <DialogDescription>
                        Isso atualizará o <strong>Salário Base</strong> de todos os contratos ativos.
                        <br />Essa ação recalcula os valores brutos e líquidos imediatamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Novo Salário Mínimo (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 1550.00"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
                    <Button onClick={handleReadjust} disabled={isPending || !newValue} className="bg-amber-600 hover:bg-amber-700">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirmar Reajuste"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}