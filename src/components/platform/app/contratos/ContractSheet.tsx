"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContractSchema, CreateContractInput } from "@/core/application/schema/contract-schema";
import { createContractAction } from "@/features/contracts/application/actions";
import { getSystemParamsAction } from "@/features/contracts/application/queries";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle, Loader2, DollarSign, RefreshCw, CalendarDays, Percent, Calculator, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractSheetProps {
    companies: { id: string; razaoSocial: string; cnpj: string }[];
    mode?: "button" | "full";
}

const REPASSE_PRESETS = [25, 35, 50] as const;
const DEFAULT_TAX_RATE = 6;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export function ContractSheet({ companies, mode = "button" }: ContractSheetProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [calcMode, setCalcMode] = useState<"PERCENT" | "VALUE">("PERCENT");
    const [negotiatedValueInput, setNegotiatedValueInput] = useState("0");

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
        if (mode !== "full") return;
        startTransition(async () => {
            const result = await getSystemParamsAction();
            if (result.success && result.minimumWage) {
                form.setValue("minimumWage", result.minimumWage);
            }
        });
    }, [mode, form]);

    const wage = Number(form.watch("minimumWage")) || 0;
    const percentage = Number(form.watch("percentage")) || 0;
    const taxRate = Number(form.watch("taxRate")) || 0;
    const partnerRate = Number(form.watch("programmerRate")) || 0;
    const allowTaxOverride = Boolean(form.watch("allowTaxOverride"));

    const selectedCompanyId = form.watch("companyId");
    const selectedCompany = useMemo(() => companies.find((company) => company.id === selectedCompanyId) ?? null, [companies, selectedCompanyId]);

    const grossValue = wage * (percentage / 100);
    const taxDeduction = grossValue * (taxRate / 100);
    const partnerDeduction = grossValue * (partnerRate / 100);
    const netValue = grossValue - taxDeduction - partnerDeduction;

    useEffect(() => {
        if (calcMode !== "PERCENT") return;
        setNegotiatedValueInput(String(Number.isFinite(grossValue) ? grossValue.toFixed(2) : "0"));
    }, [grossValue, calcMode]);

    useEffect(() => {
        if (calcMode !== "VALUE") return;
        const negotiated = Number(negotiatedValueInput) || 0;
        const nextPercentage = wage > 0 ? (negotiated / wage) * 100 : 0;
        form.setValue("percentage", Number(nextPercentage.toFixed(4)), { shouldDirty: true, shouldValidate: true });
    }, [calcMode, negotiatedValueInput, wage, form]);

    useEffect(() => {
        if (!selectedCompany) return;
        form.setValue("contractNumber", selectedCompany.cnpj, { shouldDirty: true, shouldValidate: true });
    }, [selectedCompany, form]);

    const onSubmit: SubmitHandler<CreateContractInput> = async (data) => {
        startTransition(async () => {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success("Contrato criado com sucesso.");
                router.replace("/app/configuracoes?tab=contracts");
                return;
            }

            toast.error(typeof result.error === "string" ? result.error : "Erro ao salvar contrato.");
        });
    };

    if (mode === "button") {
        return (
            <Button className="h-9 gap-2" onClick={() => router.push("/app/configuracoes?tab=contracts&mode=create")}>
                <PlusCircle className="h-4 w-4" /> Novo Contrato
            </Button>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-200px)] rounded-2xl border border-border/50 bg-background/70 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border/50 px-6 py-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Cadastro de Contrato</h2>
                    <p className="text-sm text-muted-foreground">Tela padrao full-screen para operacoes de cadastro.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => router.replace("/app/configuracoes?tab=contracts")}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 p-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Numero do contrato</Label>
                                <Input type="text" className="h-10" value={selectedCompany?.cnpj ?? ""} readOnly />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Empresa contratante</Label>
                                <select
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    onChange={(event) => form.setValue("companyId", event.target.value, { shouldValidate: true })}
                                    value={form.watch("companyId")}
                                >
                                    <option value="">Selecione a empresa...</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>{company.razaoSocial}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vigencia</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Inicio</Label>
                                <Input type="date" className="h-10" {...form.register("startDate" as any)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Fim (opcional)</Label>
                                <Input type="date" className="h-10" {...form.register("endDate" as any)} />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Regra Financeira</Label>
                            {isPending && (
                                <div className="flex items-center gap-1.5 text-[10px] text-primary">
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando...
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Base de calculo</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input type="number" step="0.01" className="pl-9 h-10 font-mono" {...form.register("minimumWage")} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">% cobrado do cliente</Label>
                                <div className="relative">
                                    <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.0001"
                                        className="pl-9 h-10 font-mono"
                                        {...form.register("percentage", {
                                            onChange: () => setCalcMode("PERCENT"),
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Valor negociado (bruto)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="pl-9 h-10 font-mono"
                                        value={negotiatedValueInput}
                                        onChange={(event) => {
                                            const raw = event.target.value;
                                            setCalcMode("VALUE");
                                            setNegotiatedValueInput(raw);
                                            const negotiated = Number(raw) || 0;
                                            const nextPercentage = wage > 0 ? (negotiated / wage) * 100 : 0;
                                            form.setValue("percentage", Number(nextPercentage.toFixed(4)), { shouldDirty: true, shouldValidate: true });
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Preencha valor ou percentual. O outro campo e calculado automaticamente.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Impostos (%)</Label>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="allowTaxOverride" className="text-[10px] text-muted-foreground">Override admin</Label>
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
                                <Input type="number" step="0.1" className="h-9 font-mono" disabled={!allowTaxOverride} {...form.register("taxRate")} />
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
                    </section>

                    <section className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observacoes Internas</Label>
                        <Textarea rows={4} placeholder="Condicoes comerciais e observacoes operacionais." {...form.register("notes")} />
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden sticky top-6">
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
                                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(netValue)}</span>
                            </div>
                        </div>

                        <div className="border-t border-border/50 p-4">
                            <Button type="submit" disabled={isPending} className="w-full gap-2">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Salvar Contrato
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

