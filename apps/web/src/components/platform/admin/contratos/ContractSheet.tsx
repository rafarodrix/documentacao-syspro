"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/application/schema/contract-schema";
import { createContractAction, getSystemParamsAction } from "@/actions/admin/contract-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle, Loader2, DollarSign, Calculator, Building2, RefreshCw,
    Laptop, Receipt, Percent, Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ContractSheet({ companies }: ContractSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isLoadingParams, setIsLoadingParams] = useState(false);

    const form = useForm<CreateContractInput>({
        resolver: zodResolver(createContractSchema) as any,
        defaultValues: {
            companyId: "",
            percentage: 10,
            minimumWage: 0,
            taxRate: 6.0,
            programmerRate: 0.0,
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
        } as any,
    });

    useEffect(() => {
        if (open) {
            const fetchSystemParams = async () => {
                setIsLoadingParams(true);
                const result = await getSystemParamsAction();
                if (result.success && result.minimumWage) {
                    form.setValue("minimumWage", result.minimumWage);
                }
                setIsLoadingParams(false);
            };
            fetchSystemParams();
        }
    }, [open, form]);

    // --- CÁLCULOS ---
    const wage = Number(form.watch("minimumWage")) || 0;
    const percentage = Number(form.watch("percentage")) || 0;
    const taxRate = Number(form.watch("taxRate")) || 0;
    const progRate = Number(form.watch("programmerRate" as any)) || 0;

    const grossValue = wage * (percentage / 100);
    const taxDeduction = grossValue * (taxRate / 100);
    const progDeduction = grossValue * (progRate / 100);
    const totalDeductions = taxDeduction + progDeduction;
    const netValue = grossValue - totalDeductions;

    const onSubmit: SubmitHandler<CreateContractInput> = async (data) => {
        startTransition(async () => {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success("Contrato criado com sucesso!");
                setOpen(false);
                form.reset();
            } else {
                toast.error(typeof result.error === 'string' ? result.error : "Erro ao salvar.");
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-9 shadow-sm hover:shadow-md transition-all bg-primary/90 hover:bg-primary gap-2">
                    <PlusCircle className="h-4 w-4" /> Novo Contrato
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l-border/50 bg-background/95 backdrop-blur-xl flex flex-col p-0">
                {/* HEADER COM DESIGN CLEAN */}
                <div className="px-6 py-6 border-b border-border/40 bg-muted/5 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader className="space-y-1">
                        <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                                <Banknote className="h-4 w-4" />
                            </div>
                            Novo Contrato
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground ml-10">
                            Configure os parâmetros financeiros e deduções do acordo.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 px-6 py-6 overflow-y-auto">
                    <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                        {/* SEÇÃO 1: EMPRESA */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados do Cliente</Label>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Empresa Contratante</Label>
                                <Select onValueChange={(val) => form.setValue("companyId", val, { shouldValidate: true })}>
                                    <SelectTrigger className="bg-background border-input/60 hover:border-primary/30 focus:ring-primary/20 transition-all h-10">
                                        <SelectValue placeholder="Selecione a empresa..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((c) => (
                                            <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                                <div className="flex items-center gap-2.5">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{c.razaoSocial}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.companyId && <p className="text-[11px] text-rose-500 font-medium ml-1">{form.formState.errors.companyId.message}</p>}
                            </div>
                        </div>

                        <Separator className="bg-border/40" />

                        {/* SEÇÃO 2: VALORES BASE */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base de Cálculo</Label>
                                {isLoadingParams && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-primary animate-pulse">
                                        <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando base...
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Salário Base</Label>
                                    <div className="relative group">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="pl-9 h-10 font-mono text-sm bg-background border-input/60 focus:border-primary/40 focus:ring-primary/10"
                                            {...form.register("minimumWage")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Percentual (%)</Label>
                                    <div className="relative group">
                                        <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            type="number"
                                            step="0.1"
                                            className="pl-9 h-10 font-mono text-sm bg-background border-input/60 focus:border-primary/40 focus:ring-primary/10"
                                            {...form.register("percentage")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 3: DEDUÇÕES */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deduções & Repasses</Label>
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/40">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] flex items-center gap-1.5">
                                        <Receipt className="h-3 w-3 text-muted-foreground" /> Impostos (%)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="h-8 text-xs font-mono bg-background border-input/40 focus:ring-0 focus:border-primary/30"
                                        {...form.register("taxRate")}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[11px] flex items-center gap-1.5">
                                        <Laptop className="h-3 w-3 text-muted-foreground" /> Repasse Dev (%)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="h-8 text-xs font-mono bg-background border-input/40 focus:ring-0 focus:border-primary/30"
                                        {...form.register("programmerRate" as any)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CARD DE SIMULAÇÃO (RECEIPT STYLE) */}
                        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                            <div className="bg-muted/30 px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
                                <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Simulação Mensal</span>
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Valor Bruto</span>
                                    <span className="font-mono font-medium text-foreground">{formatCurrency(grossValue)}</span>
                                </div>

                                <div className="space-y-1 pl-2 border-l-2 border-border/40">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">(-) Impostos</span>
                                        <span className="font-mono text-rose-500/80">{formatCurrency(taxDeduction)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">(-) Repasse Dev</span>
                                        <span className="font-mono text-rose-500/80">{formatCurrency(progDeduction)}</span>
                                    </div>
                                </div>

                                <Separator className="bg-border/40" />

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-foreground">Líquido Estimado</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                                            {formatCurrency(netValue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <SheetFooter className="p-6 border-t border-border/40 bg-muted/5 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="hover:bg-muted/50">
                            Cancelar
                        </Button>
                        <Button type="submit" form="contract-form" disabled={isPending || isLoadingParams} className="min-w-[140px] shadow-md shadow-primary/10">
                            {isPending ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Processando...</span>
                                </div>
                            ) : (
                                "Confirmar Contrato"
                            )}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}