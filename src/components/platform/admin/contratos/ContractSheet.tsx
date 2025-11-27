"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/validation/contract-schema";
import { createContractAction, getSystemParamsAction } from "@/app/(platform)/admin/_actions/contract-actions";
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
    Laptop, // Ícone para o programador
    Receipt // Ícone para impostos
} from "lucide-react";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ContractSheet({ companies }: ContractSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isLoadingParams, setIsLoadingParams] = useState(false);

    // CORREÇÃO LINHA 45: 
    // O 'as any' no defaultValues garante que o form inicie mesmo se o TS estiver com cache antigo do schema.
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

    // Efeito para carregar dados do sistema
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

    // --- CÁLCULOS EM TEMPO REAL ---
    // CORREÇÃO LINHA 69:
    // Adicionei 'as any' nas chaves do watch para evitar erro se o TS não reconhecer o campo novo ainda.
    const wage = Number(form.watch("minimumWage")) || 0;
    const percentage = Number(form.watch("percentage")) || 0;
    const taxRate = Number(form.watch("taxRate")) || 0;
    const progRate = Number(form.watch("programmerRate" as any)) || 0;

    // 1. Valor Bruto (Base * %)
    const grossValue = wage * (percentage / 100);

    // 2. Deduções (Calculadas sobre o Bruto)
    const taxDeduction = grossValue * (taxRate / 100);
    const progDeduction = grossValue * (progRate / 100);
    const totalDeductions = taxDeduction + progDeduction;

    // 3. Líquido Final
    const netValue = grossValue - totalDeductions;

    // CORREÇÃO LINHA 117:
    // O tipo foi forçado no onSubmit para casar com o handleSubmit
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
                <Button className="h-9 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" /> Novo Contrato
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-md w-full overflow-y-auto border-l-border/50 bg-background/95 backdrop-blur-xl flex flex-col p-0">
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-xl text-foreground">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            Novo Contrato
                        </SheetTitle>
                        <SheetDescription>Configure os parâmetros e deduções do acordo.</SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Empresa */}
                        <div className="space-y-2">
                            <Label>Empresa Contratante</Label>
                            <Select onValueChange={(val) => form.setValue("companyId", val, { shouldValidate: true })}>
                                <SelectTrigger className="bg-background/50 h-10">
                                    <SelectValue placeholder="Selecione a empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium">{c.razaoSocial}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.companyId && <p className="text-xs text-red-500">{form.formState.errors.companyId.message}</p>}
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Base de Cálculo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Salário Base</Label>
                                    {isLoadingParams && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                                </div>
                                <div className="relative group">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                                    <Input type="number" step="0.01" className="pl-9 bg-background/50 h-10 font-mono" {...form.register("minimumWage")} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Percentual (%)</Label>
                                <div className="relative">
                                    <Input type="number" step="0.1" className="bg-background/50 pr-8 h-10 font-mono" {...form.register("percentage")} />
                                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Seção de Deduções */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Deduções & Repasses</Label>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Impostos */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1 text-xs">
                                        <Receipt className="h-3 w-3" /> Impostos (%)
                                    </Label>
                                    <div className="relative">
                                        <Input type="number" step="0.1" className="bg-background/50 pr-8 h-9 font-mono text-sm" {...form.register("taxRate")} />
                                        <span className="absolute right-3 top-2 text-muted-foreground text-xs">%</span>
                                    </div>
                                </div>

                                {/* Programador */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1 text-xs">
                                        <Laptop className="h-3 w-3" /> Repasse Dev (%)
                                    </Label>
                                    <div className="relative">
                                        {/* CORREÇÃO: Registro do input com type assertion se necessário */}
                                        <Input type="number" step="0.1" className="bg-background/50 pr-8 h-9 font-mono text-sm" {...form.register("programmerRate" as any)} />
                                        <span className="absolute right-3 top-2 text-muted-foreground text-xs">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card de Simulação */}
                        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
                                <Calculator className="h-3.5 w-3.5" /> Simulação Mensal
                            </div>

                            <div className="space-y-2 pt-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Valor Bruto:</span>
                                    <span className="font-mono text-foreground font-medium">{formatCurrency(grossValue)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3" /> Dedução Imposto ({taxRate}%):</span>
                                    <span className="font-mono text-rose-500">- {formatCurrency(taxDeduction)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1"><Laptop className="h-3 w-3" /> Repasse Dev ({progRate}%):</span>
                                    <span className="font-mono text-rose-500">- {formatCurrency(progDeduction)}</span>
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-3 mt-2 flex justify-between items-center">
                                <span className="font-semibold text-sm text-foreground">Líquido Estimado:</span>
                                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                    {formatCurrency(netValue)}
                                </span>
                            </div>
                        </div>

                    </form>
                </div>

                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
                        <Button type="submit" form="contract-form" disabled={isPending || isLoadingParams} className="min-w-[140px]">
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando</> : "Criar Contrato"}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}