"use server";

import {
  batchReadjustContractsAction as batchReadjustContractsActionImpl,
  createContractAction as createContractActionImpl,
  updateContractAction as updateContractActionImpl,
  updateContractStatusAction as updateContractStatusActionImpl,
} from "@/features/contracts/application/actions";

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
