"use server";

import {
  runSefazCheckAction as runSefazCheckActionImpl,
  updateRbacMatrixVisibilityAction as updateRbacMatrixVisibilityActionImpl,
  updateSettingsAction as updateSettingsActionImpl,
  updateSefazRoutesAction as updateSefazRoutesActionImpl,
} from "@/features/settings/application/actions";

export async function updateSettingsAction(
  ...args: Parameters<typeof updateSettingsActionImpl>
) {
  return updateSettingsActionImpl(...args);
}

export async function updateRbacMatrixVisibilityAction(
  ...args: Parameters<typeof updateRbacMatrixVisibilityActionImpl>
) {
  return updateRbacMatrixVisibilityActionImpl(...args);
}

export async function updateSefazRoutesAction(
  ...args: Parameters<typeof updateSefazRoutesActionImpl>
) {
  return updateSefazRoutesActionImpl(...args);
}

export async function runSefazCheckAction(
  ...args: Parameters<typeof runSefazCheckActionImpl>
) {
  return runSefazCheckActionImpl(...args);
}
