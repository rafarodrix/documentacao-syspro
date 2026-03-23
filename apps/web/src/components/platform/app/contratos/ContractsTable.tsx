"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ContractStatus } from "@prisma/client";
import type { ContractListItem, ContractSuspendImpact } from "@/features/contracts/domain/model";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Building2,
    CalendarClock,
    MoreHorizontal,
    Pencil,
    FileText,
    Trash2,
    ArrowRightLeft,
    Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateContractAction, updateContractStatusAction } from "@/features/contracts/application/actions";
import { getContractSuspendImpactAction } from "@/features/contracts/application/queries";
import {
    ContractBlockReason,
    CONTRACT_BLOCK_REASONS,
    CONTRACT_BLOCK_REASON_LABEL,
} from "@dosc-syspro/core";
import { DEFAULT_CONTRACT_TAX_RATE } from "@/core/application/schema/contract-schema";

interface ContractsTableProps {
    contracts: ContractListItem[];
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatDate = (dateStr: string | Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));

const toNumber = (value: number | string) => {
    if (typeof value === "number") return value;
    return Number(value);
};

export function ContractsTable({ contracts }: ContractsTableProps) {
    const [items, setItems] = useState<ContractListItem[]>(contracts);
    const [isPending, startTransition] = useTransition();
    const [suspendTarget, setSuspendTarget] = useState<ContractListItem | null>(null);
    const [blockReason, setBlockReason] = useState<ContractBlockReason>("EMPRESA_FECHOU");
    const [blockReasonDetails, setBlockReasonDetails] = useState("");
    const [suspendImpact, setSuspendImpact] = useState<ContractSuspendImpact | null>(null);
    const [isImpactLoading, setIsImpactLoading] = useState(false);
    const [editTarget, setEditTarget] = useState<ContractListItem | null>(null);
    const [allowTaxOverride, setAllowTaxOverride] = useState(false);
    const [editForm, setEditForm] = useState({
        contractNumber: "",
        minimumWage: "",
        percentage: "",
        taxRate: String(DEFAULT_CONTRACT_TAX_RATE),
        programmerRate: "",
        startDate: "",
        endDate: "",
        notes: "",
    });

    useEffect(() => {
        setItems(contracts);
    }, [contracts]);

    const requiresDetails = useMemo(() => blockReason === "OUTROS", [blockReason]);

    useEffect(() => {
        let isMounted = true;

        const loadImpact = async () => {
            if (!suspendTarget) {
                setSuspendImpact(null);
                setIsImpactLoading(false);
                return;
            }

            setIsImpactLoading(true);
            const result = await getContractSuspendImpactAction(suspendTarget.id);
            if (!isMounted) return;

            if (result.success && result.data) {
                setSuspendImpact(result.data);
            } else {
                setSuspendImpact(null);
                toast.error(typeof result.error === "string" ? result.error : "Nao foi possivel calcular o impacto.");
            }
            setIsImpactLoading(false);
        };

        loadImpact();
        return () => {
            isMounted = false;
        };
    }, [suspendTarget]);

    const handleSuspend = () => {
        if (!suspendTarget) return;
        if (requiresDetails && !blockReasonDetails.trim()) {
            toast.error("Informe o motivo detalhado para a opcao Outros.");
            return;
        }

        startTransition(async () => {
            const result = await updateContractStatusAction(
                suspendTarget.id,
                ContractStatus.SUSPENDED,
                blockReason,
                blockReasonDetails,
            );

            if (result.success) {
                toast.success(result.message ?? "Contrato inativado com sucesso.");
                setItems((prev) => prev.filter((contract) => contract.id !== suspendTarget.id));
                setSuspendTarget(null);
                setBlockReason("EMPRESA_FECHOU");
                setBlockReasonDetails("");
                setSuspendImpact(null);
                return;
            }

            toast.error(typeof result.error === "string" ? result.error : "Erro ao inativar contrato.");
        });
    };

    const handleActivate = (contractId: string) => {
        startTransition(async () => {
            const result = await updateContractStatusAction(contractId, ContractStatus.ACTIVE);
            if (result.success) {
                toast.success(result.message ?? "Contrato ativado com sucesso.");
                setItems((prev) => prev.map((contract) => (
                    contract.id === contractId ? { ...contract, status: ContractStatus.ACTIVE } : contract
                )));
                return;
            }

            toast.error(typeof result.error === "string" ? result.error : "Erro ao ativar contrato.");
        });
    };

    const openEditDialog = (contract: ContractListItem) => {
        const currentTax = toNumber(contract.taxRate);
        setAllowTaxOverride(currentTax !== DEFAULT_CONTRACT_TAX_RATE);
        setEditTarget(contract);
        setEditForm({
            contractNumber: contract.company.cnpj,
            minimumWage: String(toNumber(contract.minimumWage)),
            percentage: String(toNumber(contract.percentage)),
            taxRate: String(currentTax),
            programmerRate: String(toNumber(contract.programmerRate)),
            startDate: new Date(contract.startDate).toISOString().slice(0, 10),
            endDate: contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : "",
            notes: contract.notes ?? "",
        });
    };

    const handleEditSave = () => {
        if (!editTarget) return;

        startTransition(async () => {
            const payload = {
                id: editTarget.id,
                companyId: editTarget.companyId,
                status: editTarget.status,
                contractNumber: editForm.contractNumber || undefined,
                notes: editForm.notes || undefined,
                minimumWage: Number(editForm.minimumWage),
                percentage: Number(editForm.percentage),
                taxRate: Number(editForm.taxRate),
                programmerRate: Number(editForm.programmerRate),
                startDate: editForm.startDate,
                endDate: editForm.endDate || undefined,
                allowTaxOverride,
            };

            const result = await updateContractAction(payload);
            if (result.success) {
                toast.success(result.message ?? "Contrato atualizado com sucesso.");
                setItems((prev) => prev.map((contract) => (
                    contract.id === editTarget.id
                        ? {
                            ...contract,
                            contractNumber: editForm.contractNumber || null,
                            notes: editForm.notes || null,
                            minimumWage: Number(editForm.minimumWage),
                            percentage: Number(editForm.percentage),
                            taxRate: allowTaxOverride ? Number(editForm.taxRate) : DEFAULT_CONTRACT_TAX_RATE,
                            programmerRate: Number(editForm.programmerRate),
                            startDate: editForm.startDate,
                            endDate: editForm.endDate || null,
                        }
                        : contract
                )));
                setEditTarget(null);
                return;
            }

            toast.error(typeof result.error === "string" ? result.error : "Erro ao atualizar contrato.");
        });
    };

    return (
        <>
            <Dialog
                open={Boolean(suspendTarget)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSuspendTarget(null);
                        setSuspendImpact(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suspender contrato</DialogTitle>
                        <DialogDescription>
                            {isImpactLoading
                                ? "Calculando impacto da suspensao..."
                                : suspendImpact?.willBlockCompany
                                    ? `${suspendImpact.blockedUsersCount} usuarios serao bloqueados${suspendImpact.companyName ? ` em ${suspendImpact.companyName}` : ""} ao suspender este contrato.`
                                    : "Este contrato nao vai bloquear usuarios agora porque ainda existe outro contrato ativo na empresa."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="blockReason">Motivo do bloqueio</Label>
                            <Select value={blockReason} onValueChange={(value) => setBlockReason(value as ContractBlockReason)}>
                                <SelectTrigger id="blockReason">
                                    <SelectValue placeholder="Selecione o motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONTRACT_BLOCK_REASONS.map((reason) => (
                                        <SelectItem key={reason} value={reason}>
                                            {CONTRACT_BLOCK_REASON_LABEL[reason]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {requiresDetails && (
                            <div className="space-y-2">
                                <Label htmlFor="blockReasonDetails">Detalhes</Label>
                                <Input
                                    id="blockReasonDetails"
                                    placeholder="Descreva o motivo"
                                    value={blockReasonDetails}
                                    onChange={(event) => setBlockReasonDetails(event.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSuspendTarget(null)} disabled={isPending || isImpactLoading}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleSuspend} disabled={isPending || isImpactLoading}>
                            Confirmar suspensao
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar contrato</DialogTitle>
                        <DialogDescription>
                            Atualize os termos financeiros e dados de controle interno do contrato.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Numero do contrato</Label>
                            <Input
                                value={editForm.contractNumber}
                                readOnly
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Inicio</Label>
                            <Input
                                type="date"
                                value={editForm.startDate}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, startDate: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fim (opcional)</Label>
                            <Input
                                type="date"
                                value={editForm.endDate}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, endDate: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Base de calculo</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editForm.minimumWage}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, minimumWage: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>% cobrado do cliente</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={editForm.percentage}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, percentage: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Impostos (%)</Label>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="editAllowTaxOverride" className="text-xs text-muted-foreground">Override admin</Label>
                                    <Switch
                                        id="editAllowTaxOverride"
                                        checked={allowTaxOverride}
                                        onCheckedChange={(checked) => {
                                            setAllowTaxOverride(checked);
                                            if (!checked) {
                                                setEditForm((prev) => ({ ...prev, taxRate: String(DEFAULT_CONTRACT_TAX_RATE) }));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <Input
                                type="number"
                                step="0.1"
                                disabled={!allowTaxOverride}
                                value={editForm.taxRate}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, taxRate: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Repasse parceiro (%)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={editForm.programmerRate}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, programmerRate: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observacoes</Label>
                        <Textarea
                            rows={3}
                            value={editForm.notes}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleEditSave} disabled={isPending}>
                            Salvar alteracoes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/20">
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                                <TableHead className="w-[300px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 h-12">Empresa / Parceiro</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Vigencia</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Base (Sal. Min)</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Aliq.</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Liquido (Final)</TableHead>
                                <TableHead className="w-[50px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
                                            <div className="p-4 rounded-full bg-muted/30">
                                                <FileText className="h-8 w-8 opacity-40" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-foreground">Nenhum contrato encontrado</p>
                                                <p className="text-xs">Cadastre um novo contrato para comecar a gestao.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((contract, index) => {
                                    const minimumWage = toNumber(contract.minimumWage);
                                    const percentage = toNumber(contract.percentage);
                                    const taxRate = toNumber(contract.taxRate);
                                    const programmerRate = toNumber(contract.programmerRate);

                                    const gross = minimumWage * (percentage / 100);
                                    const taxDed = gross * (taxRate / 100);
                                    const progDed = gross * ((programmerRate || 0) / 100);
                                    const net = gross - taxDed - progDed;
                                    const isActive = contract.status === ContractStatus.ACTIVE;

                                    return (
                                        <TableRow
                                            key={contract.id}
                                            className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover/row:bg-primary/20 group-hover/row:scale-105">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                                                            {contract.company.razaoSocial}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono tracking-tight">
                                                            CNPJ: {contract.company.cnpj}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                                                    <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                                                    {formatDate(contract.startDate)}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                                    {formatCurrency(minimumWage)}
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="outline" className="bg-background/50 font-mono text-[10px] font-normal border-border/60">
                                                    {percentage.toFixed(4)}%
                                                </Badge>
                                            </TableCell>

                                            <TableCell>
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors",
                                                    isActive
                                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                                                        : "bg-muted text-muted-foreground border-border",
                                                )}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                                                    {isActive ? "Ativo" : "Inativo"}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className={cn(
                                                        "font-bold font-mono text-sm tracking-tight tabular-nums",
                                                        isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                                                    )}>
                                                        {formatCurrency(net)}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                                                        <Wallet className="h-3 w-3" />
                                                        <span>Bruto: {formatCurrency(gross)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity data-[state=open]:opacity-100">
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground">Gerenciar Contrato</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />

                                                        <DropdownMenuItem onClick={() => openEditDialog(contract)} className="cursor-pointer gap-2">
                                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                            Editar Termos
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem onClick={() => toast.info("Em breve: Historico")} className="cursor-pointer gap-2">
                                                            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                                            Ver Repasses
                                                        </DropdownMenuItem>

                                                        <DropdownMenuSeparator />

                                                        {isActive ? (
                                                            <DropdownMenuItem
                                                                disabled={isPending}
                                                                onClick={() => setSuspendTarget(contract)}
                                                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer gap-2"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Suspender
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                disabled={isPending}
                                                                onClick={() => handleActivate(contract.id)}
                                                                className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 cursor-pointer gap-2"
                                                            >
                                                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                                                Reativar
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </>
    );
}

