import type { TaxActionResponse, TaxSyncChunkRequest } from "@/features/tax/domain/tax.types";

export interface TaxWriteRepository {
  saveClassificationBatch(chunk: unknown[], metadata?: TaxSyncChunkRequest): Promise<TaxActionResponse>;
  saveAnexosBatch(chunk: unknown[], metadata?: TaxSyncChunkRequest): Promise<TaxActionResponse>;
  saveCredPresumidoBatch(chunk: unknown[], metadata?: TaxSyncChunkRequest): Promise<TaxActionResponse>;
  saveNcmBatch(chunk: unknown[], metadata?: TaxSyncChunkRequest): Promise<TaxActionResponse>;
}
