"use server";

import {
  saveTaxAnexosBatch as saveTaxAnexosBatchImpl,
  saveTaxCredPresumidoBatch as saveTaxCredPresumidoBatchImpl,
  saveTaxDataBatch as saveTaxDataBatchImpl,
  saveTaxNcmBatch as saveTaxNcmBatchImpl,
} from "@/features/tax/application/actions";

export async function saveTaxDataBatch(
  ...args: Parameters<typeof saveTaxDataBatchImpl>
) {
  return saveTaxDataBatchImpl(...args);
}

export async function saveTaxAnexosBatch(
  ...args: Parameters<typeof saveTaxAnexosBatchImpl>
) {
  return saveTaxAnexosBatchImpl(...args);
}

export async function saveTaxCredPresumidoBatch(
  ...args: Parameters<typeof saveTaxCredPresumidoBatchImpl>
) {
  return saveTaxCredPresumidoBatchImpl(...args);
}

export async function saveTaxNcmBatch(
  ...args: Parameters<typeof saveTaxNcmBatchImpl>
) {
  return saveTaxNcmBatchImpl(...args);
}
