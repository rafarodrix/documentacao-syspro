export interface FieldMetadata {
  label: string;
  xmlTag: string;
  description: string;
  impact: string;
  sped?: string;
}

export const FIELD_METADATA: Record<string, FieldMetadata> = {
  default: {
    label: "Dica de Parametrizacao",
    xmlTag: "---",
    description: "Passe o mouse ou clique em um campo para ver os detalhes tecnicos, tags XML e impactos fiscais correspondentes.",
    impact: "A configuracao correta evita rejeicoes na SEFAZ e erros no SPED.",
  },
  empresa: {
    label: "Codigo da Empresa",
    xmlTag: "<xNome> / <CNPJ>",
    description: "Identificacao da empresa emitente no ERP. Usado para vincular a serie e numeracao.",
    impact: "Define qual certificado digital sera utilizado na assinatura.",
  },
  descricao: {
    label: "Descricao Interna",
    xmlTag: "N/A",
    description: "Nome amigavel para identificar esta configuracao dentro do sistema.",
    impact: "Facilita a busca pelos faturistas no momento da emissao.",
  },
  modelo: {
    label: "Modelo do Documento",
    xmlTag: "<mod>",
    description: "Codigo do modelo fiscal. 55=NFe, 65=NFCe, 57=CTe.",
    impact: "Modelo incorreto gera rejeicao fiscal.",
    sped: "Registro C100, Campo 05",
  },
  serie: {
    label: "Serie Fiscal",
    xmlTag: "<serie>",
    description: "Serie de numeracao da nota. Deve seguir sequencia cronologica.",
    impact: "Series distintas permitem numeracao independente.",
    sped: "Registro C100, Campo 07",
  },
  grupoDocumento: {
    label: "Grupo de Negocio",
    xmlTag: "<natOp>",
    description: "Define a natureza da operacao impressa no DANFE.",
    impact: "Determina regras contabeis e de estoque automaticas do ERP.",
    sped: "Influencia o CFOP e a conta contabil.",
  },
  movimentaEstoque: {
    label: "Movimentacao de Estoque",
    xmlTag: "N/A",
    description: "Regra interna do ERP para baixar ou acrescer saldo fisico.",
    impact: "Afeta o estoque escriturado.",
    sped: "Registro K200",
  },
  finalidadeNFe: {
    label: "Finalidade de Emissao",
    xmlTag: "<finNFe>",
    description: "1=Normal, 2=Complementar, 3=Ajuste, 4=Devolucao.",
    impact: "Finalidade incorreta pode gerar rejeicao.",
    sped: "Registro C100, Campo 06",
  },
  cfopEstadual: {
    label: "CFOP Estadual",
    xmlTag: "<CFOP>",
    description: "Codigo fiscal usado quando emitente e destinatario estao na mesma UF.",
    impact: "Define a tributacao do ICMS e se a operacao gera receita.",
    sped: "Registro C190",
  },
  cfopInterestadual: {
    label: "CFOP Interestadual",
    xmlTag: "<CFOP>",
    description: "Codigo fiscal usado quando emitente e destinatario estao em UFs diferentes.",
    impact: "Valida regras de DIFAL e partilha de ICMS.",
    sped: "Registro C190",
  },
  comportamentos: {
    label: "Regras de Automacao",
    xmlTag: "Varias tags",
    description: "Define gatilhos automaticos como calculo de impostos e validacoes.",
    impact: "Automatiza o preenchimento de tags fiscais.",
  },
};

export const GRUPOS_DOCUMENTO = [
  { value: "EAJ", label: "AJUSTE DE ESTOQUE" },
  { value: "FDE", label: "DESPESAS C/ AGUA E ESGOTO / GAS" },
  { value: "EBC", label: "EMISSAO BONIFICACAO CONCEDIDA" },
  { value: "EDV", label: "EMISSAO DE DEVOLUCAO DE VENDA" },
  { value: "EDO", label: "EMISSAO DE DOACOES" },
  { value: "ENP", label: "EMISSAO DE NOTA FISCAL DE VENDA PDV" },
  { value: "ETM", label: "EMISSAO DE TRANSFERENCIA PARA PRODUCAO" },
  { value: "EVP", label: "EMISSAO DE VENDA DE PRODUTOS PDV" },
  { value: "EVD", label: "EMISSAO DE VENDA DIRETA DE MERCADORIAS" },
  { value: "EOS", label: "EMISSAO DE VENDA FUTURA" },
  { value: "EDC", label: "EMISSAO DEVOLUCAO DE COMPRA" },
  { value: "EPE", label: "EMISSAO PERDAS E FURTOS DE MERCADORIA" },
  { value: "ESS", label: "EMISSAO POR SIMPLES REMESSA" },
  { value: "EST", label: "EMISSAO POR TRANSFERENCIA DE MERCADORIA" },
  { value: "PCP", label: "PEDIDO DE COMPRA" },
  { value: "EBR", label: "RECEBIMENTO DE BONIFICACAO" },
  { value: "EAQ", label: "RECEBIMENTO DE MERCADORIAS" },
  { value: "ECI", label: "RECEBIMENTO DE MERCADORIAS PARA CONSUMO INTERNO" },
  { value: "EOE", label: "RECEBIMENTO POR OUTRAS ENTRADAS" },
  { value: "EPD", label: "RECEBIMENTO POR PRODUCAO DE MERCADORIA" },
  { value: "EES", label: "RECEBIMENTO POR SIMPLES REMESSA" },
  { value: "EET", label: "RECEBIMENTO POR TRANSFERENCIA DE MERCADORIA" },
  { value: "ETE", label: "RECEBIMENTO POR TROCA DE MERCADORIA" },
] as const;

export const COMPORTAMENTOS_DOCUMENTO = [
  { id: "CP001", label: "ZERAR VALORES DA BASE E IMPOSTO ICMS" },
  { id: "CP002", label: "ZERAR VALORES DA BASE E IMPOSTO ICMS EM OPERACOES INTERESTADUAIS" },
  { id: "CP004", label: "CALCULAR DIFAL" },
  { id: "CP005", label: "CALCULAR ANTECIPACAO DO IMPOSTO" },
  { id: "CP006", label: "APLICAR A CONFERENCIA DE VALORES NOS TOTALIZADORES DO CABECALHO" },
  { id: "CP007", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR ICMS" },
  { id: "CP008", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR ICMS STB" },
  { id: "CP009", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR CODIGO CST E CSOSN" },
  { id: "CP010", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR IPI" },
  { id: "CP011", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR PIS" },
  { id: "CP012", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR COFINS" },
  { id: "CP013", label: "ATUALIZAR PRODUTO-TRIBUTACAO: MENSAGEM NOTA FISCAL" },
  { id: "CP014", label: "ATUALIZAR PRODUTO-TRIBUTACAO: ATUALIZAR CFOP" },
  { id: "CP015", label: "VALIDAR VALOR DE VENDA MENOR QUE CUSTO DE REPOSICAO" },
] as const;

export const TIPOS_NOTA_DEBITO = [
  { value: "01", label: "01 - Transferencia de creditos para cooperativas" },
  { value: "02", label: "02 - Anulacao de credito por saidas imunes/isentas" },
  { value: "03", label: "03 - Debitos de notas nao processadas" },
  { value: "04", label: "04 - Multa e juros" },
  { value: "05", label: "05 - Transferencia de credito na sucessao" },
  { value: "06", label: "06 - Pagamento antecipado" },
  { value: "07", label: "07 - Perda em estoque" },
  { value: "08", label: "08 - Desenquadramento do Simples Nacional" },
] as const;

export const TIPOS_NOTA_CREDITO = [
  { value: "01", label: "01 - Multa e juros" },
  { value: "02", label: "02 - Credito presumido na ZFM" },
  { value: "03", label: "03 - Retorno por recusa ou nao localizacao" },
  { value: "04", label: "04 - Reducao de valores" },
  { value: "05", label: "05 - Transferencia de credito na sucessao" },
] as const;