import type { DocumentoFormValues } from "@dosc-syspro/contracts";

export type DocumentoItem = DocumentoFormValues;

export type DocumentoActionResponse<T = void> = {
    success: boolean;
    error?: string;
    data?: T;
};

export type DocumentosListResponse = DocumentoActionResponse<DocumentoItem[]>;
