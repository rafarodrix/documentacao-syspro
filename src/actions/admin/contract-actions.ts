"use server";

import { prisma } from "@/lib/prisma";
import {
    createContractSchema,
    updateContractSchema,
    CreateContractInput,
    UpdateContractInput,
    DEFAULT_CONTRACT_TAX_RATE,
} from "@/core/application/schema/contract-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { CompanyStatus, ContractStatus, Role } from "@prisma/client";
import {
    ContractBlockReason,
    serializeContractBlockReason,
    parseContractBlockReason,
} from "@/core/config/contract-blocking";

const WRITE_ROLES: Role[] = [Role.ADMIN];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

export async function getSystemParamsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado." };

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEYS.MIN_WAGE }
        });

        const currentWage = setting ? Number(setting.value) : 1412;
        return { success: true, minimumWage: currentWage };
    } catch (error) {
        console.error("Erro ao buscar parametros do sistema:", error);
        return { success: false, error: "Erro ao carregar parametros." };
    }
}

export async function getContractsAction() {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) return { success: false, error: "Nao autorizado." };

    try {
        const contracts = await prisma.contract.findMany({
            select: {
                id: true,
                companyId: true,
                percentage: true,
                minimumWage: true,
                taxRate: true,
                programmerRate: true,
                contractNumber: true,
                notes: true,
                status: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: {
                        id: true,
                        razaoSocial: true,
                        cnpj: true,
                    }
                }
            },
            orderBy: [
                { status: "asc" },
                { createdAt: "desc" },
            ],
        });
        return { success: true, data: contracts };
    } catch (error) {
        console.error("Erro ao buscar contratos:", error);
        return { success: false, error: "Erro ao carregar contratos." };
    }
}

export async function createContractAction(data: CreateContractInput) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    const validation = createContractSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados invalidos." };
    }

    try {
        let finalMinimumWage = data.minimumWage;

        if (!finalMinimumWage || finalMinimumWage <= 0) {
            const systemParams = await getSystemParamsAction();
            if (systemParams.success && systemParams.minimumWage) {
                finalMinimumWage = systemParams.minimumWage;
            } else {
                finalMinimumWage = 1412;
            }
        }

        await prisma.contract.create({
            data: {
                companyId: data.companyId,
                percentage: data.percentage,
                minimumWage: finalMinimumWage,
                taxRate: data.allowTaxOverride ? data.taxRate : DEFAULT_CONTRACT_TAX_RATE,
                programmerRate: data.programmerRate,
                status: data.status,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                endDate: data.endDate ? new Date(data.endDate) : null,
                contractNumber: data.contractNumber?.trim() || null,
                notes: data.notes?.trim() || null,
            }
        });

        await prisma.company.update({
            where: { id: data.companyId },
            data: { status: CompanyStatus.ACTIVE, deletedAt: null, observacoes: null },
        });

        await prisma.user.updateMany({
            where: {
                deletedAt: null,
                role: { in: CLIENT_ROLES },
                memberships: { some: { companyId: data.companyId } },
            },
            data: { isActive: true },
        });

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");
        revalidatePath("/app/cadastros/empresa");
        revalidatePath("/app/cadastros/usuarios");

        return { success: true, message: "Contrato criado com sucesso!" };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        return { success: false, error: "Erro interno ao salvar contrato." };
    }
}

export async function updateContractAction(data: UpdateContractInput) {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    const validation = updateContractSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados invalidos." };
    }

    try {
        const parsed = validation.data;

        await prisma.contract.update({
            where: { id: parsed.id },
            data: {
                percentage: parsed.percentage,
                minimumWage: parsed.minimumWage,
                taxRate: parsed.allowTaxOverride ? parsed.taxRate : DEFAULT_CONTRACT_TAX_RATE,
                programmerRate: parsed.programmerRate,
                status: parsed.status,
                startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                contractNumber: parsed.contractNumber?.trim() || null,
                notes: parsed.notes?.trim() || null,
            },
        });

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");
        revalidatePath("/app/cadastros/empresa");
        revalidatePath("/app/cadastros/usuarios");

        return { success: true, message: "Contrato atualizado com sucesso." };
    } catch (error) {
        console.error("Erro ao atualizar contrato:", error);
        return { success: false, error: "Erro ao atualizar contrato." };
    }
}

export async function batchReadjustContractsAction(newMinimumWage: number) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada. Apenas administradores podem reajustar contratos." };
    }

    if (!newMinimumWage || newMinimumWage <= 0) {
        return { success: false, error: "Valor do novo salario minimo invalido." };
    }

    try {
        const result = await prisma.contract.updateMany({
            where: {
                status: ContractStatus.ACTIVE,
            },
            data: {
                minimumWage: newMinimumWage,
                updatedAt: new Date(),
            },
        });

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");

        return {
            success: true,
            message: `Reajuste aplicado! ${result.count} contratos atualizados para R$ ${newMinimumWage}.`,
            affected: result.count,
        };

    } catch (error) {
        console.error("Erro no reajuste em lote:", error);
        return { success: false, error: "Erro interno ao processar reajuste." };
    }
}

export async function updateContractStatusAction(
    contractId: string,
    status: ContractStatus,
    blockReason?: ContractBlockReason,
    blockReasonDetails?: string,
) {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    try {
        const updated = await prisma.contract.update({
            where: { id: contractId },
            data: { status },
            select: { id: true, companyId: true, status: true },
        });

        if (status !== ContractStatus.ACTIVE) {
            const activeContracts = await prisma.contract.count({
                where: {
                    companyId: updated.companyId,
                    status: ContractStatus.ACTIVE,
                },
            });

            if (activeContracts === 0) {
                const reason = blockReason ?? "OUTROS";
                const notes = serializeContractBlockReason(reason, blockReasonDetails);
                await prisma.company.update({
                    where: { id: updated.companyId },
                    data: { status: CompanyStatus.SUSPENDED, deletedAt: new Date(), observacoes: notes },
                });

                // Desativa apenas usuarios cliente que ficaram sem qualquer empresa ativa com contrato ativo.
                await prisma.user.updateMany({
                    where: {
                        deletedAt: null,
                        role: { in: CLIENT_ROLES },
                        AND: [
                            { memberships: { some: { companyId: updated.companyId } } },
                            {
                                memberships: {
                                    none: {
                                        company: {
                                            status: CompanyStatus.ACTIVE,
                                            deletedAt: null,
                                            contracts: {
                                                some: {
                                                    status: ContractStatus.ACTIVE,
                                                    OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        ],
                    },
                    data: { isActive: false },
                });
            }
        } else {
            const currentCompany = await prisma.company.findUnique({
                where: { id: updated.companyId },
                select: { observacoes: true },
            });

            const hasContractBlock = parseContractBlockReason(currentCompany?.observacoes);

            await prisma.company.update({
                where: { id: updated.companyId },
                data: {
                    status: CompanyStatus.ACTIVE,
                    deletedAt: null,
                    observacoes: hasContractBlock ? null : currentCompany?.observacoes ?? null,
                },
            });

            await prisma.user.updateMany({
                where: {
                    deletedAt: null,
                    role: { in: CLIENT_ROLES },
                    memberships: { some: { companyId: updated.companyId } },
                },
                data: { isActive: true },
            });
        }

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");
        revalidatePath("/app/cadastros/empresa");
        revalidatePath("/app/cadastros/usuarios");

        return {
            success: true,
            message: status === ContractStatus.ACTIVE ? "Contrato ativado com sucesso." : "Contrato inativado com sucesso.",
        };
    } catch (error) {
        console.error("Erro ao atualizar status do contrato:", error);
        return { success: false, error: "Erro ao atualizar status do contrato." };
    }
}

export async function getContractSuspendImpactAction(contractId: string) {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    try {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            select: {
                id: true,
                status: true,
                companyId: true,
                company: { select: { razaoSocial: true } },
            },
        });

        if (!contract) {
            return { success: false, error: "Contrato nao encontrado." };
        }

        if (contract.status !== ContractStatus.ACTIVE) {
            return {
                success: true,
                data: {
                    companyName: contract.company.razaoSocial,
                    willBlockCompany: false,
                    blockedUsersCount: 0,
                    totalLinkedUsers: 0,
                },
            };
        }

        const remainingActiveContracts = await prisma.contract.count({
            where: {
                companyId: contract.companyId,
                status: ContractStatus.ACTIVE,
                id: { not: contract.id },
            },
        });

        const totalLinkedUsers = await prisma.user.count({
            where: {
                deletedAt: null,
                isActive: true,
                role: { in: CLIENT_ROLES },
                memberships: { some: { companyId: contract.companyId } },
            },
        });

        if (remainingActiveContracts > 0) {
            return {
                success: true,
                data: {
                    companyName: contract.company.razaoSocial,
                    willBlockCompany: false,
                    blockedUsersCount: 0,
                    totalLinkedUsers,
                },
            };
        }

        const blockedUsersCount = await prisma.user.count({
            where: {
                deletedAt: null,
                isActive: true,
                role: { in: CLIENT_ROLES },
                AND: [
                    { memberships: { some: { companyId: contract.companyId } } },
                    {
                        memberships: {
                            none: {
                                companyId: { not: contract.companyId },
                                company: {
                                    status: CompanyStatus.ACTIVE,
                                    deletedAt: null,
                                    contracts: {
                                        some: {
                                            status: ContractStatus.ACTIVE,
                                            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        });

        return {
            success: true,
            data: {
                companyName: contract.company.razaoSocial,
                willBlockCompany: true,
                blockedUsersCount,
                totalLinkedUsers,
            },
        };
    } catch (error) {
        console.error("Erro ao calcular impacto da suspensao:", error);
        return { success: false, error: "Erro ao calcular impacto da suspensao." };
    }
}
