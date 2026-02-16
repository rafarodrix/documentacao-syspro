"use server";

import { prisma } from "@/lib/prisma";
import { createContractSchema, CreateContractInput } from "@/core/application/schema/contract-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { redirect } from "next/navigation";

const WRITE_ROLES = ["ADMIN"];

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

/**
 * Busca o salário mínimo configurado no sistema.
 * Útil para preencher formulários no front-end ou fallback no back-end.
 */
export async function getSystemParamsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEYS.MIN_WAGE }
        });

        // Retorna o valor do banco ou o fallback 1412
        const currentWage = setting ? Number(setting.value) : 1412;

        return { success: true, minimumWage: currentWage };
    } catch (error) {
        console.error("Erro ao buscar parâmetros do sistema:", error);
        return { success: false, error: "Erro ao carregar parâmetros." };
    }
}

// ---------------------------------------------------------
// ACTIONS DE LEITURA E CRIAÇÃO
// ---------------------------------------------------------

export async function getContractsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        const contracts = await prisma.contract.findMany({
            include: {
                company: {
                    select: { razaoSocial: true, cnpj: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: contracts };
    } catch (error) {
        console.error("Erro ao buscar contratos:", error);
        return { success: false, error: "Erro ao carregar contratos." };
    }
}

export async function createContractAction(data: CreateContractInput) {
    const session = await getProtectedSession();

    // Verifica se o usuário tem permissão de escrita
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissão negada." };
    }

    const validation = createContractSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados inválidos." };
    }

    try {
        let finalMinimumWage = data.minimumWage;

        // LÓGICA INTELIGENTE:
        // Se o valor vier zerado ou nulo, buscamos o padrão do sistema.
        if (!finalMinimumWage || finalMinimumWage <= 0) {
            const systemParams = await getSystemParamsAction();
            if (systemParams.success && systemParams.minimumWage) {
                finalMinimumWage = systemParams.minimumWage;
            } else {
                finalMinimumWage = 1412; // Fallback final de segurança
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

        revalidatePath("/admin/contratos");
        return { success: true, message: "Contrato criado com sucesso!" };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        return { success: false, error: "Erro interno ao salvar contrato." };
    }
}

// ---------------------------------------------------------
// ACTIONS DE MANUTENÇÃO (REAJUSTES)
// ---------------------------------------------------------

/**
 * Reajusta o salário mínimo base de todos os contratos ATIVOS.
 * Deve ser chamado quando houver aumento do salário mínimo (ex: Jan/Fev).
 */
export async function batchReadjustContractsAction(newMinimumWage: number) {
    const session = await getProtectedSession();

    // Usa a mesma constante WRITE_ROLES para validar permissão
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissão negada. Apenas administradores podem reajustar contratos." };
    }

    if (!newMinimumWage || newMinimumWage <= 0) {
        return { success: false, error: "Valor do novo salário mínimo inválido." };
    }

    try {
        // Atualiza APENAS contratos que estão ATIVOS
        const result = await prisma.contract.updateMany({
            where: {
                status: "ACTIVE",
            },
            data: {
                minimumWage: newMinimumWage,
                updatedAt: new Date(), // Atualiza o timestamp
            },
        });

        // Revalida as rotas afetadas para atualizar a UI
        revalidatePath("/admin/contratos");
        revalidatePath("/admin/configuracoes");

        return {
            success: true,
            message: `Reajuste aplicado! ${result.count} contratos atualizados para R$ ${newMinimumWage}.`
        };

    } catch (error) {
        console.error("Erro no reajuste em lote:", error);
        return { success: false, error: "Erro interno ao processar reajuste." };
    }
}