import type { DocumentoFormValues } from "@dosc-syspro/contracts";

export type DocumentoItem = DocumentoFormValues & {
    createdAt: Date;
    updatedAt: Date;
    empresa: string | null;
    emitente: string | null;
    maximoItens: number | null;
    atualizaComercial: boolean | null;
    processamentoEtapa: boolean | null;
    tpNFCredito: string | null;
    tpNFDebito: string | null;
    cfopEstadual: string | null;
    cfopInterestadual: string | null;
    cfopEstadualST: string | null;
    cfopInterestadualST: string | null;
    cfopEstadualConsumidor: string | null;
    cfopInterestadualConsumidor: string | null;
    cfopInternacional: string | null;
};

export type DocumentoActionResponse<T = void> = {
    success: boolean;
    error?: string;
    data?: T;
};

export type DocumentosListResponse = DocumentoActionResponse<DocumentoItem[]>;
