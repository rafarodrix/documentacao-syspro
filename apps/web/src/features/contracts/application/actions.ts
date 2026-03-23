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
  serializeContractBlockReason,
} from "@/core/config/contract-blocking";
import type { ContractBlockReason } from "@/core/config/contract-blocking";
import { getSystemParamsAction } from "@/features/contracts/application/queries";
import type { ContractActionResponse } from "@/features/contracts/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];
const BATCH_CHUNK_SIZE = 50;
const BATCH_CHUNK_MAX_RETRIES = 3;

export async function createContractAction(data: CreateContractInput): Promise<ContractActionResponse> {
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
      if (systemParams.success && systemParams.data?.minimumWage) {
        finalMinimumWage = systemParams.data.minimumWage;
      } else {
        finalMinimumWage = 1412;
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { cnpj: true },
    });

    if (!company) {
      return { success: false, error: "Empresa nao encontrada." };
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
        contractNumber: company.cnpj,
        notes: data.notes?.trim() || null,
      },
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

export async function updateContractAction(data: UpdateContractInput): Promise<ContractActionResponse> {
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

    const company = await prisma.company.findUnique({
      where: { id: parsed.companyId },
      select: { cnpj: true },
    });

    if (!company) {
      return { success: false, error: "Empresa nao encontrada." };
    }

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
        contractNumber: company.cnpj,
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

export async function batchReadjustContractsAction(newMinimumWage: number): Promise<ContractActionResponse<{ affected: number }>> {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada. Apenas administradores podem reajustar contratos." };
  }

  if (!newMinimumWage || newMinimumWage <= 0) {
    return { success: false, error: "Valor do novo salario minimo invalido." };
  }

  try {
    const activeContractIds = await prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
      },
      select: { id: true },
    });

    let affected = 0;
    for (let i = 0; i < activeContractIds.length; i += BATCH_CHUNK_SIZE) {
      const chunkIds = activeContractIds.slice(i, i + BATCH_CHUNK_SIZE).map((item) => item.id);
      if (!chunkIds.length) continue;

      let attempt = 1;
      for (;;) {
        try {
          const result = await prisma.contract.updateMany({
            where: {
              id: { in: chunkIds },
              status: ContractStatus.ACTIVE,
            },
            data: {
              minimumWage: newMinimumWage,
              updatedAt: new Date(),
            },
          });
          affected += result.count;
          break;
        } catch (error) {
          if (attempt >= BATCH_CHUNK_MAX_RETRIES) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
          attempt += 1;
        }
      }
    }

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEYS.MIN_WAGE },
      update: { value: String(newMinimumWage) },
      create: { key: SETTING_KEYS.MIN_WAGE, value: String(newMinimumWage), description: "Salario minimo base" },
    });

    revalidatePath("/app/contratos");
    revalidatePath("/app/configuracoes");

    return { success: true, data: { affected } };
  } catch (error) {
    console.error("Erro ao reajustar contratos:", error);
    return { success: false, error: "Erro ao aplicar reajuste em massa." };
  }
}

export async function updateContractStatusAction(
  contractId: string,
  status: ContractStatus,
  reason?: ContractBlockReason | null,
  details?: string | null,
): Promise<ContractActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, companyId: true, status: true },
    });

    if (!contract) {
      return { success: false, error: "Contrato nao encontrado." };
    }

    const isDeactivating = status !== ContractStatus.ACTIVE;

    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contractId },
        data: {
          status,
        },
      });

      const activeContracts = await tx.contract.count({
        where: {
          companyId: contract.companyId,
          status: ContractStatus.ACTIVE,
          id: { not: contractId },
        },
      });

      if (isDeactivating && activeContracts === 0) {
        const blockReason = reason ? serializeContractBlockReason(reason, details ?? undefined) : null;

        await tx.company.update({
          where: { id: contract.companyId },
          data: {
            status: CompanyStatus.SUSPENDED,
            observacoes: blockReason,
          },
        });

        await tx.user.updateMany({
          where: {
            deletedAt: null,
            role: { in: CLIENT_ROLES },
            memberships: { some: { companyId: contract.companyId } },
          },
          data: { isActive: false },
        });
      }

      if (!isDeactivating) {
        await tx.company.update({
          where: { id: contract.companyId },
          data: {
            status: CompanyStatus.ACTIVE,
            deletedAt: null,
            observacoes: null,
          },
        });

        await tx.user.updateMany({
          where: {
            deletedAt: null,
            role: { in: CLIENT_ROLES },
            memberships: { some: { companyId: contract.companyId } },
          },
          data: { isActive: true },
        });
      }
    });

    revalidatePath("/app/contratos");
    revalidatePath("/app/configuracoes");
    revalidatePath("/app/cadastros/empresa");
    revalidatePath("/app/cadastros/usuarios");

    return { success: true, message: "Status do contrato atualizado." };
  } catch (error) {
    console.error("Erro ao atualizar status do contrato:", error);
    return { success: false, error: "Erro ao atualizar status do contrato." };
  }
}
