"use server";

import {
  batchReadjustContractsAction as batchReadjustContractsActionImpl,
  createContractAction as createContractActionImpl,
  getContractsAction as getContractsActionImpl,
  getContractSuspendImpactAction as getContractSuspendImpactActionImpl,
  getSystemParamsAction as getSystemParamsActionImpl,
  updateContractAction as updateContractActionImpl,
  updateContractStatusAction as updateContractStatusActionImpl,
} from "@/features/contracts/application/actions";

export async function getSystemParamsAction(
  ...args: Parameters<typeof getSystemParamsActionImpl>
) {
  return getSystemParamsActionImpl(...args);
}

export async function getContractsAction(
  ...args: Parameters<typeof getContractsActionImpl>
) {
  return getContractsActionImpl(...args);
}

export async function createContractAction(
  ...args: Parameters<typeof createContractActionImpl>
) {
  return createContractActionImpl(...args);
}

export async function updateContractAction(
  ...args: Parameters<typeof updateContractActionImpl>
) {
  return updateContractActionImpl(...args);
}

export async function batchReadjustContractsAction(
  ...args: Parameters<typeof batchReadjustContractsActionImpl>
) {
  return batchReadjustContractsActionImpl(...args);
}

export async function updateContractStatusAction(
  ...args: Parameters<typeof updateContractStatusActionImpl>
) {
  return updateContractStatusActionImpl(...args);
}

export async function getContractSuspendImpactAction(
  ...args: Parameters<typeof getContractSuspendImpactActionImpl>
) {
  return getContractSuspendImpactActionImpl(...args);
}
