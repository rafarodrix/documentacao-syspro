export type DocumentoItem = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    empresa: string | null;
    descricao: string;
    grupoDocumento: string;
    modelo: string;
    serie: string;
    emitente: string | null;
    maximoItens: number | null;
    movimentaEstoque: string;
    atualizaComercial: boolean | null;
    processamentoEtapa: boolean | null;
    finalidadeNFe: string;
    tpNFCredito: string | null;
    tpNFDebito: string | null;
    comportamentos: string[];
    cfopEstadual: string | null;
    cfopInterestadual: string | null;
    cfopEstadualST: string | null;
    cfopInterestadualST: string | null;
    cfopEstadualConsumidor: string | null;
    cfopInterestadualConsumidor: string | null;
    cfopInternacional: string | null;
};

export type DocumentoActionSuccess<T = void> = T extends void
  ? { success: true }
  : { success: true; data: T };

export type DocumentoActionFailure = {
  success: false;
  error: string;
};

export type DocumentoActionResponse<T = void> = DocumentoActionSuccess<T> | DocumentoActionFailure;

export type DocumentosListResponse = DocumentoActionResponse<DocumentoItem[]>;
