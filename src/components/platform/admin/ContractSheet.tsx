"use client";

import { useState, useTransition, useEffect } from "react";
// 1. Importe SubmitHandler
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/validation/contract-schema";
import { createContractAction, getSystemParamsAction } from "@/app/(platform)/admin/_actions/contract-actions";
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
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Loader2, DollarSign, Calculator, Building2, RefreshCw } from "lucide-react";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ContractSheet({ companies }: ContractSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isLoadingParams, setIsLoadingParams] = useState(false);

    // 2. CORREÇÃO LINHA 50: Adicione 'as any' no resolver
    const form = useForm<CreateContractInput>({
        resolver: zodResolver(createContractSchema) as any,
        defaultValues: {
            companyId: "",
            percentage: 10,
            minimumWage: 0,
            taxRate: 6.0,
            status: "ACTIVE",
            startDate: new Date().toISOString().split('T')[0],
        },
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

    const percentage = Number(form.watch("percentage")) || 0;
    const wage = Number(form.watch("minimumWage")) || 0;
    const tax = Number(form.watch("taxRate")) || 0;

    const estimatedValue = wage * (percentage / 100);
    const taxValue = estimatedValue * (tax / 100);
    const estimatedNet = estimatedValue - taxValue;

    // 3. CORREÇÃO LINHA 124: Tipagem explícita do SubmitHandler
    const onSubmit: SubmitHandler<CreateContractInput> = async (data) => {
        startTransition(async () => {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success("Contrato criado com sucesso!");
                setOpen(false);
                form.reset();
            } else {
                const errorMsg = typeof result.error === 'string' ? result.error : "Erro ao salvar contrato.";
                toast.error(errorMsg);
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-9 shadow-md shadow-primary/20 transition-all hover:shadow-primary/40 bg-primary hover:bg-primary/90">
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
                        <SheetDescription>
                            Configure os parâmetros financeiros do acordo.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    {/* Agora o handleSubmit aceita o onSubmit sem reclamar */}
                    <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-2">
                            <Label className="text-foreground/80">Empresa Contratante</Label>
                            <Select
                                onValueChange={(val) => form.setValue("companyId", val, { shouldValidate: true })}
                                defaultValue={form.getValues("companyId")}
                            >
                                <SelectTrigger className="bg-background/50 focus:bg-background transition-colors h-10">
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
                            {form.formState.errors.companyId && (
                                <p className="text-xs text-red-500 animate-in slide-in-from-left-1 font-medium">
                                    {form.formState.errors.companyId.message}
                                </p>
                            )}
                        </div>

                        <Separator className="bg-border/60" />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-foreground/80">Salário Base</Label>
                                    {isLoadingParams && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                                </div>
                                <div className="relative group">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm group-focus-within:text-primary transition-colors">R$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-9 bg-background/50 focus:bg-background transition-colors h-10 font-mono"
                                        {...form.register("minimumWage")}
                                    />
                                </div>
                                {form.formState.errors.minimumWage && (
                                    <span className="text-xs text-red-500 font-medium">{form.formState.errors.minimumWage.message}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground/80">Percentual (%)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-background/50 focus:bg-background transition-colors pr-8 h-10 font-mono"
                                        {...form.register("percentage")}
                                    />
                                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                                </div>
                                {form.formState.errors.percentage && (
                                    <span className="text-xs text-red-500 font-medium">{form.formState.errors.percentage.message}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground/80">Impostos / Deduções (%)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    className="bg-background/50 focus:bg-background transition-colors pr-8 h-10 font-mono"
                                    {...form.register("taxRate")}
                                />
                                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">%</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Taxa descontada do valor bruto calculado.</p>
                        </div>

                        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary/80 uppercase tracking-wider">
                                <Calculator className="h-3.5 w-3.5" /> Simulação Mensal
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Valor Bruto:</span>
                                    <span className="font-mono text-foreground">{formatCurrency(estimatedValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Deduções ({tax}%):</span>
                                    <span className="font-mono text-rose-500">- {formatCurrency(taxValue)}</span>
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-3 mt-2 flex justify-between items-center">
                                <span className="font-semibold text-sm text-foreground">Líquido Estimado:</span>
                                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                    {formatCurrency(estimatedNet)}
                                </span>
                            </div>
                        </div>

                    </form>
                </div>

                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} type="button" disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="contract-form" disabled={isPending || isLoadingParams} className="shadow-lg shadow-primary/20 min-w-[140px]">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando
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