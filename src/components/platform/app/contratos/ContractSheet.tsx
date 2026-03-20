"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/application/schema/contract-schema";
import { createContractAction, getSystemParamsAction } from "@/actions/admin/contract-actions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle, Loader2, DollarSign, Building2, RefreshCw, Banknote, CalendarDays, Percent, Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string }[];
}

const REPASSE_PRESETS = [25, 35, 50] as const;
const DEFAULT_TAX_RATE = 6;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export function ContractSheet({ companies }: ContractSheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<CreateContractInput>({
        resolver: zodResolver(createContractSchema) as any,
        defaultValues: {
            companyId: "",
            percentage: 10,
            minimumWage: 0,
            taxRate: DEFAULT_TAX_RATE,
            programmerRate: 25,
            status: "ACTIVE",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            contractNumber: "",
            notes: "",
            allowTaxOverride: false,
        } as any,
    });

    useEffect(() => {
        if (!open) return;

        startTransition(async () => {
            const result = await getSystemParamsAction();
            if (result.success && result.minimumWage) {
                form.setValue("minimumWage", result.minimumWage);
            }
        });
    }, [open, form]);

    const wage = Number(form.watch("minimumWage")) || 0;
    const percentage = Number(form.watch("percentage")) || 0;
    const taxRate = Number(form.watch("taxRate")) || 0;
    const partnerRate = Number(form.watch("programmerRate")) || 0;
    const allowTaxOverride = Boolean(form.watch("allowTaxOverride"));

    const grossValue = wage * (percentage / 100);
    const taxDeduction = grossValue * (taxRate / 100);
    const partnerDeduction = grossValue * (partnerRate / 100);
    const netValue = grossValue - taxDeduction - partnerDeduction;

    const onSubmit: SubmitHandler<CreateContractInput> = async (data) => {
        startTransition(async () => {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success("Contrato criado com sucesso.");
                setOpen(false);
                form.reset({
                    companyId: "",
                    percentage: 10,
                    minimumWage: 0,
                    taxRate: DEFAULT_TAX_RATE,
                    programmerRate: 25,
                    status: "ACTIVE",
                    startDate: new Date().toISOString().split("T")[0],
                    endDate: "",
                    contractNumber: "",
                    notes: "",
                    allowTaxOverride: false,
                } as any);
                return;
            }

            toast.error(typeof result.error === "string" ? result.error : "Erro ao salvar contrato.");
        });
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="h-9 shadow-sm hover:shadow-md transition-all bg-primary/90 hover:bg-primary gap-2">
                    <PlusCircle className="h-4 w-4" /> Novo Contrato
                </Button>
            </SheetTrigger>

            <SheetContent className="sm:max-w-lg w-full overflow-y-auto border-l-border/50 bg-background/95 backdrop-blur-xl flex flex-col p-0">
                <div className="px-6 py-6 border-b border-border/40 bg-muted/5 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader className="space-y-1">
                        <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                                <Banknote className="h-4 w-4" />
                            </div>
                            Cadastro de Contrato
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground ml-10">
                            Defina vigencia e regra financeira para previsibilidade de receita.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="flex-1 px-6 py-6 overflow-y-auto">
                    <form id="contract-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
                        <section className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Numero do contrato</Label>
                                    <Input
                                        type="text"
                                        placeholder="Ex.: CTR-2026-001"
                                        className="h-10"
                                        {...form.register("contractNumber")}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Empresa contratante</Label>
                                <Select onValueChange={(val) => form.setValue("companyId", val, { shouldValidate: true })}>
                                    <SelectTrigger className="bg-background border-input/60 hover:border-primary/30 focus:ring-primary/20 transition-all h-10">
                                        <SelectValue placeholder="Selecione a empresa..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                                                <div className="flex items-center gap-2.5">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{company.razaoSocial}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.companyId && (
                                    <p className="text-[11px] text-rose-500 font-medium">{String(form.formState.errors.companyId.message)}</p>
                                )}
                            </div>
                        </section>

                        <Separator className="bg-border/40" />

                        <section className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vigencia</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                        Inicio
                                    </Label>
                                    <Input type="date" className="h-10" {...form.register("startDate" as any)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                        Fim (opcional)
                                    </Label>
                                    <Input type="date" className="h-10" {...form.register("endDate" as any)} />
                                </div>
                            </div>
                            {form.formState.errors.endDate && (
                                <p className="text-[11px] text-rose-500 font-medium">{String(form.formState.errors.endDate.message)}</p>
                            )}
                        </section>

                        <Separator className="bg-border/40" />

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Regra Financeira</Label>
                                {isPending && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-primary">
                                        <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando...
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Base de calculo (salario minimo)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" step="0.01" className="pl-9 h-10 font-mono" {...form.register("minimumWage")} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">% cobrado do cliente</Label>
                                    <div className="relative">
                                        <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" step="0.1" className="pl-9 h-10 font-mono" {...form.register("percentage")} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Impostos (%)</Label>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="allowTaxOverride" className="text-[10px] text-muted-foreground">
                                                Override admin
                                            </Label>
                                            <Switch
                                                id="allowTaxOverride"
                                                checked={allowTaxOverride}
                                                onCheckedChange={(checked) => {
                                                    form.setValue("allowTaxOverride", checked, { shouldValidate: true });
                                                    if (!checked) form.setValue("taxRate", DEFAULT_TAX_RATE, { shouldValidate: true });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="h-9 font-mono"
                                        disabled={!allowTaxOverride}
                                        {...form.register("taxRate")}
                                    />
                                    {!allowTaxOverride && (
                                        <p className="text-[10px] text-muted-foreground">Imposto travado em 6% por politica.</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Repasse parceiro (%)</Label>
                                    <Input type="number" step="0.1" className="h-9 font-mono" {...form.register("programmerRate")} />
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        {REPASSE_PRESETS.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => form.setValue("programmerRate", value, { shouldValidate: true })}
                                                className={cn(
                                                    "px-2 py-0.5 rounded border text-[10px] transition-colors",
                                                    partnerRate === value
                                                        ? "bg-primary/10 border-primary/40 text-primary"
                                                        : "border-border/50 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {value}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {form.formState.errors.programmerRate && (
                                <p className="text-[11px] text-rose-500 font-medium">{String(form.formState.errors.programmerRate.message)}</p>
                            )}
                        </section>

                        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
                            <div className="bg-muted/30 px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
                                <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo Mensal</span>
                            </div>

                            <div className="p-4 space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bruto ({percentage}%)</span>
                                    <span className="font-mono">{formatCurrency(grossValue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Impostos ({taxRate}%)</span>
                                    <span className="font-mono text-rose-500/90">- {formatCurrency(taxDeduction)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Repasse parceiro ({partnerRate}%)</span>
                                    <span className="font-mono text-rose-500/90">- {formatCurrency(partnerDeduction)}</span>
                                </div>
                                <Separator className="my-1" />
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-foreground">Liquido estimado</span>
                                    <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(netValue)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <section className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observacoes Internas</Label>
                            <Textarea
                                rows={4}
                                placeholder="Ex.: condicoes comerciais, observacoes de negociacao, particularidades do cliente."
                                {...form.register("notes")}
                            />
                        </section>
                    </form>
                </div>

                <SheetFooter className="p-6 border-t border-border/40 bg-muted/5 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="contract-form" disabled={isPending} className="min-w-[160px] shadow-md shadow-primary/10">
                            {isPending ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Salvando...
                                </span>
                            ) : (
                                "Salvar Contrato"
                            )}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
