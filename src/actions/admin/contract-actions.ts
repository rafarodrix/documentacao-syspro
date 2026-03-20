"use server";

import { prisma } from "@/lib/prisma";
import { createContractSchema, CreateContractInput } from "@/core/application/schema/contract-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { CompanyStatus, ContractStatus, Role } from "@prisma/client";

const WRITE_ROLES: Role[] = [Role.ADMIN];

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
            where: {
                status: ContractStatus.ACTIVE,
            },
            select: {
                id: true,
                companyId: true,
                percentage: true,
                minimumWage: true,
                taxRate: true,
                programmerRate: true,
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
            orderBy: { createdAt: "desc" }
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
                taxRate: data.taxRate,
                programmerRate: data.programmerRate,
                status: data.status,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
            }
        });

        await prisma.company.update({
            where: { id: data.companyId },
            data: { status: CompanyStatus.ACTIVE, deletedAt: null },
        });

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");
        revalidatePath("/app/cadastros/empresa");

        return { success: true, message: "Contrato criado com sucesso!" };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        return { success: false, error: "Erro interno ao salvar contrato." };
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

export async function updateContractStatusAction(contractId: string, status: ContractStatus) {
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
                await prisma.company.update({
                    where: { id: updated.companyId },
                    data: { status: CompanyStatus.SUSPENDED, deletedAt: new Date() },
                });
            }
        } else {
            await prisma.company.update({
                where: { id: updated.companyId },
                data: { status: CompanyStatus.ACTIVE, deletedAt: null },
            });
        }

        revalidatePath("/app/contratos");
        revalidatePath("/app/configuracoes");
        revalidatePath("/app/cadastros/empresa");

        return {
            success: true,
            message: status === ContractStatus.ACTIVE ? "Contrato ativado com sucesso." : "Contrato inativado com sucesso.",
        };
    } catch (error) {
        console.error("Erro ao atualizar status do contrato:", error);
        return { success: false, error: "Erro ao atualizar status do contrato." };
    }
}
