"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/validation/contract-schema";
import { createContractAction } from "@/app/(platform)/admin/_actions/contract-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, DollarSign, Calculator, Building2 } from "lucide-react";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

export function ContractSheet({ companies }: ContractSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        resolver: zodResolver(createContractSchema),
        defaultValues: {
            companyId: "",
            percentage: 10,
            minimumWage: 1412.00,
            taxRate: 6.0,
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
        },
    });

    // Watch for real-time calculation
    // Usamos 'Number()' para garantir que o valor seja tratado como número, mesmo que venha como string do input
    const percentage = Number(form.watch("percentage")) || 0;
    const wage = Number(form.watch("minimumWage")) || 0;
    const tax = Number(form.watch("taxRate")) || 0;

    // Calculations
    const estimatedValue = wage * (percentage / 100);
    const estimatedNet = estimatedValue - (estimatedValue * (tax / 100));

    async function onSubmit(data: CreateContractInput) {
        startTransition(async () => {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success("Contrato criado com sucesso!");
                setOpen(false);

                form.reset({
                    companyId: "",
                    percentage: 10,
                    minimumWage: 1412.00,
                    taxRate: 6.0,
                    status: "ACTIVE",
                    startDate: new Date().toISOString().split('T')[0],
                });
            } else {
                const errorMsg = typeof result.error === 'string' ? result.error : "Erro ao salvar contrato.";
                toast.error(errorMsg);
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-9 shadow-md shadow-primary/20 transition-all hover:shadow-primary/40">
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo Contrato
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l-border/50 bg-background/95 backdrop-blur-xl flex flex-col p-0">
                {/* Header */}
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            Novo Contrato
                        </SheetTitle>
                        <SheetDescription>
                            Defina as regras de cobrança baseadas no salário mínimo.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Form Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Empresa Select */}
                        <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Select
                                onValueChange={(val) => form.setValue("companyId", val, { shouldValidate: true })}
                                defaultValue={form.getValues("companyId")}
                            >
                                <SelectTrigger className="bg-muted/30 focus:bg-background transition-colors">
                                    <SelectValue placeholder="Selecione a empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                {c.razaoSocial}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.companyId && (
                                <span className="text-xs text-red-500 animate-in slide-in-from-left-1">
                                    Selecione uma empresa válida.
                                </span>
                            )}
                        </div>

                        {/* Values Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Salário Mínimo (Base)</Label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm group-focus-within:text-primary transition-colors">R$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-9 bg-muted/30 focus:bg-background transition-colors"
                                        {...form.register("minimumWage")}
                                    />
                                </div>
                                {form.formState.errors.minimumWage && (
                                    <span className="text-xs text-red-500">{form.formState.errors.minimumWage?.message}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Percentual Cobrado (%)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-muted/30 focus:bg-background transition-colors pr-8"
                                        {...form.register("percentage")}
                                    />
                                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                                </div>
                                {form.formState.errors.percentage && (
                                    <span className="text-xs text-red-500">{form.formState.errors.percentage?.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Impostos / Deduções (%)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    className="bg-muted/30 focus:bg-background transition-colors pr-8"
                                    {...form.register("taxRate")}
                                />
                                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Percentual descontado do valor bruto.</p>
                        </div>

                        {/* Card de Simulação */}
                        <div className="bg-gradient-to-br from-muted/50 to-muted/20 p-4 rounded-xl border border-border/50 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <Calculator className="h-4 w-4" /> Simulação Mensal
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Valor Bruto:</span>
                                    <span className="font-medium">R$ {estimatedValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Impostos ({tax}%):</span>
                                    {/* CORREÇÃO: Cálculo de impostos com Number() garantido */}
                                    <span className="text-red-500 font-medium">- R$ {(estimatedValue * (tax / 100)).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-2 flex justify-between items-center">
                                <span className="font-semibold text-sm text-foreground">Líquido Estimado:</span>
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                    {/* CORREÇÃO: Exibição final com Number() garantido */}
                                    R$ {estimatedNet.toFixed(2)}
                                </span>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} type="button" disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="contract-form" disabled={isPending} className="shadow-lg shadow-primary/20">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
                                </>
                            ) : (
                                "Criar Contrato"
                            )}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}