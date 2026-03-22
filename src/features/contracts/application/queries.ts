"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { CompanyStatus, ContractStatus, Role } from "@prisma/client";
import type { ContractListItem, ContractsAdminViewData } from "@/features/contracts/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

export async function getSystemParamsAction() {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado." };

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.MIN_WAGE },
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
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const data: ContractListItem[] = contracts.map((contract) => ({
      ...contract,
      percentage: Number(contract.percentage),
      minimumWage: Number(contract.minimumWage),
      taxRate: Number(contract.taxRate),
      programmerRate: Number(contract.programmerRate),
    }));
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);
    return { success: false, error: "Erro ao carregar contratos." };
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
        companyId: true,
        status: true,
        company: {
          select: {
            razaoSocial: true,
          },
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato nao encontrado." };
    }

    const activeContracts = await prisma.contract.count({
      where: {
        companyId: contract.companyId,
        status: ContractStatus.ACTIVE,
        id: { not: contractId },
      },
    });

    const totalLinkedUsers = await prisma.membership.count({
      where: { companyId: contract.companyId },
    });

    const blockedUsersCount = await prisma.user.count({
      where: {
        deletedAt: null,
        role: { in: CLIENT_ROLES },
        memberships: { some: { companyId: contract.companyId } },
      },
    });

    return {
      success: true,
      data: {
        companyName: contract.company.razaoSocial,
        willBlockCompany: activeContracts === 0,
        blockedUsersCount,
        totalLinkedUsers,
      },
    };
  } catch (error) {
    console.error("Erro ao consultar impacto de suspensao do contrato:", error);
    return { success: false, error: "Erro ao consultar impacto." };
  }
}

export async function getContractsAdminViewData(): Promise<ContractsAdminViewData> {
  const [contractsRes, companies] = await Promise.all([
    getContractsAction(),
    prisma.company.findMany({
      where: { deletedAt: null, status: { not: CompanyStatus.INACTIVE } },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, cnpj: true },
    }),
  ]);

  return {
    contracts: contractsRes.success && contractsRes.data ? contractsRes.data : [],
    companies,
  };
}
