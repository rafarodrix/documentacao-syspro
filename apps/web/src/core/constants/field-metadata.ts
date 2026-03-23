export interface FieldMetadata {
    label: string;
    xmlTag: string;
    description: string;
    impact: string;
    sped?: string;
}

export const FIELD_METADATA: Record<string, FieldMetadata> = {
    // Padrão (quando nenhum campo está focado)
    default: {
        label: "Dica de Parametrização",
        xmlTag: "---",
        description: "Passe o mouse ou clique em um campo para ver os detalhes técnicos, tags XML e impactos fiscais correspondentes.",
        impact: "A configuração correta evita rejeições na SEFAZ e erros no SPED.",
    },
    empresa: {
        label: "Código da Empresa",
        xmlTag: "<xNome> / <CNPJ>",
        description: "Identificação da empresa emitente no ERP. Usado para vincular a série e numeração.",
        impact: "Define qual certificado digital será utilizado na assinatura.",
    },
    descricao: {
        label: "Descrição Interna",
        xmlTag: "N/A",
        description: "Nome amigável para identificar esta configuração dentro do sistema.",
        impact: "Facilita a busca pelos faturistas no momento da emissão.",
    },
    modelo: {
        label: "Modelo do Documento",
        xmlTag: "<mod>",
        description: "Código do modelo fiscal. 55=NFe (Mercadorias), 65=NFCe (Consumidor), 57=CTe (Transporte).",
        impact: "Modelo incorreto gera Rejeição 252 (Tipo de ambiente diferente do modelo).",
        sped: "Registro C100, Campo 05",
    },
    serie: {
        label: "Série Fiscal",
        xmlTag: "<serie>",
        description: "Série de numeração da nota. Deve seguir sequência cronológica.",
        impact: "Séries distintas permitem numeração independente (ex: Série 1 para Venda, Série 2 para Contingência).",
        sped: "Registro C100, Campo 07",
    },
    grupoDocumento: {
        label: "Grupo de Negócio",
        xmlTag: "<natOp>",
        description: "Define a Natureza da Operação que será impressa no DANFE.",
        impact: "Determina as regras contábeis e de estoque automáticas do ERP.",
        sped: "Influencia o CFOP e a conta contábil.",
    },
    movimentaEstoque: {
        label: "Movimentação de Estoque",
        xmlTag: "N/A",
        description: "Regra interna do ERP para baixar ou acrescer saldo físico.",
        impact: "Notas fiscais (Mod 55) geralmente movimentam estoque, exceto em operações simbólicas ou triangular.",
        sped: "Registro K200 (Estoque Escriturado).",
    },
    finalidadeNFe: {
        label: "Finalidade de Emissão",
        xmlTag: "<finNFe>",
        description: "1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução.",
        impact: "Se incorreto (ex: Devolução com finalidade 1), a SEFAZ rejeita a nota (Rejeição 327 ou 328).",
        sped: "Registro C100, Campo 06.",
    },
    cfopEstadual: {
        label: "CFOP Estadual (Interno)",
        xmlTag: "<CFOP>",
        description: "Código Fiscal usado quando Emitente e Destinatário estão na mesma UF.",
        impact: "Define a tributação do ICMS e se a operação gera receita.",
        sped: "Registro C190.",
    },
    cfopInterestadual: {
        label: "CFOP Interestadual",
        xmlTag: "<CFOP>",
        description: "Código Fiscal usado quando Emitente e Destinatário estão em UFs diferentes.",
        impact: "Valida regras de DIFAL e Partilha de ICMS.",
        sped: "Registro C190.",
    },
    comportamentos: {
        label: "Regras de Automação",
        xmlTag: "Várias Tags",
        description: "Define gatilhos automáticos como cálculo de impostos (DIFAL, ST) e validações de preço.",
        impact: "Automatiza o preenchimento das tags <ICMS>, <IPI>, <PIS>, <COFINS>.",
    }
};