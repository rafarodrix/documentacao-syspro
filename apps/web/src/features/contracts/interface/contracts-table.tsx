"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ContractListItem, ContractSuspendImpact } from "@/features/contracts/domain/contract.types";
import { TableCell, TableRow, Card, Badge, Button, Input, Label, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DataTable } from "@dosc-syspro/ui";
import { type ColumnDef } from "@tanstack/react-table";
import {
    Building2,
    CalendarClock,
    MoreHorizontal,
    Pencil,
    FileText,
    Trash2,
    ArrowRightLeft,
    Wallet,
    CircleOff,
    TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteContractAction, updateContractStatusAction } from "@/features/contracts/application/contract-write.actions";
import { getContractSuspendImpactAction } from "@/features/contracts/application/contract-read.queries";
import {
    ContractBlockReason,
} from "@dosc-syspro/core";
import {
    DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
    type ContractBlockReasonOption,
} from "@dosc-syspro/contracts/settings";
import { fetchSettingsPreferences } from "@/features/settings/application/preferences";
import { formatDateShort } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";
import { calculateContractFinancials } from "@dosc-syspro/shared";

const formatDate = (dateStr: string | Date) => formatDateShort(dateStr);

const toNumber = (value: number | string) => {
    if (typeof value === "number") return value;
    return Number(value);
};

interface ContractsTableProps {
    contracts: ContractListItem[];
    canEdit: boolean;
    canDelete: boolean;
}

export function ContractsTable({ contracts, canEdit, canDelete }: ContractsTableProps) {
    const router = useRouter();
    const fallbackContractReason = DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS[0]?.key ?? "EMPRESA_FECHOU";
    const [items, setItems] = useState<ContractListItem[]>(contracts);
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const [suspendTarget, setSuspendTarget] = useState<ContractListItem | null>(null);
    const [blockReason, setBlockReason] = useState<ContractBlockReason>(fallbackContractReason);
    const [blockReasonDetails, setBlockReasonDetails] = useState("");
    const [contractReasonOptions, setContractReasonOptions] = useState<ContractBlockReasonOption[]>(
        DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
    );
    const [suspendImpact, setSuspendImpact] = useState<ContractSuspendImpact | null>(null);
    const [isImpactLoading, setIsImpactLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ContractListItem | null>(null);

    useEffect(() => {
        setItems(contracts);
    }, [contracts]);

    useEffect(() => {
        let active = true;

        async function loadSettingsPreferences() {
            const preferences = await fetchSettingsPreferences();
            if (!active || !preferences) return;

            const activeReasons = preferences.contractBlockReasons.filter((item) => item.isActive);
            if (activeReasons.length) {
                setContractReasonOptions(activeReasons);
                setBlockReason((current) =>
                    activeReasons.some((item) => item.key === current) ? current : activeReasons[0].key,
                );
            }
        }

        void loadSettingsPreferences();
        return () => {
            active = false;
        };
    }, []);

    const selectedBlockReason = useMemo(
        () => contractReasonOptions.find((item) => item.key === blockReason) ?? null,
        [blockReason, contractReasonOptions],
    );
    const requiresDetails = useMemo(() => selectedBlockReason?.requiresDetails ?? false, [selectedBlockReason]);

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

            if (!result.success) {
                setSuspendImpact(null);
                toast.error(result.error);
                setIsImpactLoading(false);
                return;
            }

            if (result.data) {
                setSuspendImpact(result.data);
            } else {
                setSuspendImpact(null);
                toast.error("Não foi possível calcular o impacto da suspensão.");
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
            toast.error("Informe o motivo detalhado para a opção Outros.");
            return;
        }

        startTransition(async () => {
            const result = await updateContractStatusAction(
                suspendTarget.id,
                "SUSPENDED",
                blockReason,
                blockReasonDetails,
            );

            if (result.success) {
                toast.success(result.message ?? "Contrato inativado com sucesso.");
                setItems((prev) => prev.filter((contract) => contract.id !== suspendTarget.id));
                setSuspendTarget(null);
                setBlockReason(contractReasonOptions[0]?.key ?? fallbackContractReason);
                setBlockReasonDetails("");
                setSuspendImpact(null);
                return;
            }

            toast.error(result.error);
        });
    };

    const handleActivate = (contractId: string) => {
        startTransition(async () => {
            const result = await updateContractStatusAction(contractId, "ACTIVE");
            if (result.success) {
                toast.success(result.message ?? "Contrato ativado com sucesso.");
                setItems((prev) => prev.map((contract) => (
                    contract.id === contractId ? { ...contract, status: "ACTIVE" } : contract
                )));
                return;
            }

            toast.error(result.error);
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;

        startTransition(async () => {
            const result = await deleteContractAction(deleteTarget.id);
            if (result.success) {
                toast.success(result.message ?? "Contrato excluído com sucesso.");
                setItems((prev) => prev.filter((contract) => contract.id !== deleteTarget.id));
                setDeleteTarget(null);
                return;
            }

            toast.error(result.error);
        });
    };

    const filteredItems = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) return items;

        return items.filter((contract) =>
            [
                contract.company.razaoSocial,
                contract.company.cnpj,
                contract.status,
                String(contract.percentage),
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalized)),
        );
    }, [items, search]);

    // Definição das Colunas com ColumnDef do TanStack
    const columns = useMemo<ColumnDef<ContractListItem>[]>(() => {
        return [
            {
                id: "company",
                header: "Empresa",
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="max-w-50 truncate text-sm font-medium text-foreground">
                                {row.original.company.razaoSocial}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono tracking-tight">
                                CNPJ: {row.original.company.cnpj}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                id: "startDate",
                header: "Vigência",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                        {formatDate(row.original.startDate)}
                    </div>
                ),
            },
            {
                id: "minimumWage",
                header: "Base",
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(toNumber(row.original.minimumWage))}
                    </span>
                ),
            },
            {
                id: "percentage",
                header: "Aliq.",
                cell: ({ row }) => (
                    <Badge variant="outline" className="h-5 border-border/60 bg-background px-1.5 font-mono text-[10px] font-normal shadow-none">
                        {toNumber(row.original.percentage).toFixed(4)}%
                    </Badge>
                ),
            },
            {
                id: "status",
                header: "Status",
                cell: ({ row }) => {
                    const isActive = row.original.status === "ACTIVE";
                    return (
                        <Badge
                            variant={isActive ? "success" : "muted"}
                            className="h-5 gap-1.5 rounded-full px-2 py-0 text-[10px] font-medium"
                        >
                            <span className={cn("h-1.5 w-1.5 rounded-full bg-current", isActive ? "animate-pulse" : "opacity-60")} />
                            {isActive ? "Ativo" : "Inativo"}
                        </Badge>
                    );
                },
            },
            {
                id: "net",
                header: () => <div className="text-right">Líquido</div>,
                cell: ({ row }) => {
                    const minimumWage = toNumber(row.original.minimumWage);
                    const percentage = toNumber(row.original.percentage);
                    const taxRate = toNumber(row.original.taxRate);
                    const programmerRate = toNumber(row.original.programmerRate);

                    const { grossValue: gross, netValue: net } = calculateContractFinancials(minimumWage, percentage, taxRate, programmerRate);
                    const isActive = row.original.status === "ACTIVE";

                    return (
                        <div className="flex flex-col items-end gap-0.5">
                            <span className={cn(
                                "font-semibold font-mono text-sm tracking-tight tabular-nums",
                                isActive ? "text-primary" : "text-muted-foreground",
                            )}>
                                {formatCurrency(net)}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/65">
                                <Wallet className="h-3 w-3" />
                                <span>Bruto: {formatCurrency(gross)}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                    const contract = row.original;
                    const isActive = contract.status === "ACTIVE";

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity data-[state=open]:opacity-100" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Gerenciar Contrato</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {canEdit ? (
                                    <DropdownMenuItem onClick={() => router.push(`/portal/contratos?mode=edit&id=${contract.id}`)} className="cursor-pointer gap-2">
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        Editar Termos
                                    </DropdownMenuItem>
                                ) : null}

                                <DropdownMenuItem onClick={() => toast.info("Em breve: Histórico")} className="cursor-pointer gap-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                    Ver Repasses
                                </DropdownMenuItem>

                                {canEdit || canDelete ? <DropdownMenuSeparator /> : null}

                                {canEdit ? (
                                    isActive ? (
                                        <DropdownMenuItem
                                            disabled={isPending}
                                            onClick={() => setSuspendTarget(contract)}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
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
                                    )
                                ) : null}

                                {canDelete ? (
                                    <DropdownMenuItem
                                        disabled={isPending}
                                        onClick={() => setDeleteTarget(contract)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Excluir
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ];
    }, [canEdit, canDelete, isPending, router]);

    const emptyStateConfig = useMemo(() => ({
        title: "Nenhum contrato encontrado",
        description: search.trim() ? "Ajuste os filtros e tente novamente." : "Cadastre um novo contrato para começar a gestão.",
        icon: FileText,
    }), [search]);

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
                        <DialogTitle className="flex items-center gap-2">
                            <CircleOff className="h-4 w-4 text-primary" />
                            Suspender contrato
                        </DialogTitle>
                        <DialogDescription>
                            {isImpactLoading
                                ? "Calculando impacto operacional..."
                                : suspendImpact?.willBlockCompany
                                    ? `${suspendImpact.blockedUsersCount} usuários serão bloqueados${suspendImpact.companyName ? ` em ${suspendImpact.companyName}` : ""}.`
                                    : "Ainda existe outro contrato ativo para esta empresa."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5">
                        {suspendTarget ? (
                            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
                                <p className="font-medium text-foreground">{suspendTarget.company.razaoSocial}</p>
                                <p className="text-xs text-muted-foreground">CNPJ: {suspendTarget.company.cnpj}</p>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="blockReason">Motivo do bloqueio</Label>
                            <Select value={blockReason} onValueChange={(value) => setBlockReason(value as ContractBlockReason)}>
                                <SelectTrigger id="blockReason">
                                    <SelectValue placeholder="Selecione o motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contractReasonOptions.map((reason) => (
                                        <SelectItem key={reason.key} value={reason.key}>
                                            {reason.label}
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

                    <DialogFooter className="border-t border-border/50 pt-4">
                        <Button variant="outline" onClick={() => setSuspendTarget(null)} disabled={isPending || isImpactLoading}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleSuspend} disabled={isPending || isImpactLoading}>
                            Confirmar suspensão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TriangleAlert className="h-4 w-4 text-primary" />
                            Excluir contrato
                        </DialogTitle>
                        <DialogDescription>
                            {deleteTarget?.status === "ACTIVE"
                                ? "A exclusão é definitiva. Se este for o último contrato ativo, a empresa e os usuários cliente vinculados serão bloqueados."
                                : "A exclusão remove este contrato da base de forma definitiva."}
                        </DialogDescription>
                    </DialogHeader>

                    {deleteTarget ? (
                        <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
                            <p className="font-medium text-foreground">{deleteTarget.company.razaoSocial}</p>
                            <p className="text-xs text-muted-foreground">CNPJ: {deleteTarget.company.cnpj}</p>
                        </div>
                    ) : null}

                    <DialogFooter className="border-t border-border/50 pt-4">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            Excluir definitivamente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="border-border/60 bg-card">
                <div className="border-b border-border/60 p-3">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por empresa, CNPJ ou status..."
                        className="h-10 border-border/60 bg-background"
                    />
                </div>
                <DataTable
                    columns={columns}
                    data={filteredItems}
                    minWidthClassName="min-w-[980px]"
                    cardClassName="border-none bg-transparent shadow-none p-0 overflow-visible rounded-none animate-none"
                    onRowDoubleClick={(contract) => canEdit && router.push(`/portal/contratos?mode=edit&id=${contract.id}`)}
                    emptyState={emptyStateConfig}
                />
            </Card>
        </>
    );
}
