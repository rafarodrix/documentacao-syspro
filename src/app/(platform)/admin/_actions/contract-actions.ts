"use server";

import { prisma } from "@/lib/prisma";
import { createContractSchema, CreateContractInput } from "@/core/validation/contract-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

const WRITE_ROLES = ["ADMIN"];

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
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissão negada." };
    }

    const validation = createContractSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados inválidos." };
    }

    try {
        await prisma.contract.create({
            data: {
                companyId: data.companyId,
                percentage: data.percentage,
                minimumWage: data.minimumWage,
                taxRate: data.taxRate,
                status: data.status,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
            }
        });

        revalidatePath("/admin/contratos");
        return { success: true };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        return { success: false, error: "Erro interno ao salvar contrato." };
    }
}

// Adicione update/delete conforme necessário depois