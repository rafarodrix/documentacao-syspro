export const TIPOS_NOTA_DEBITO = [
    { value: "01", label: "01 - Transferência de créditos para cooperativas" },
    { value: "02", label: "02 - Anulação de crédito por saídas imunes/isentas" },
    { value: "03", label: "03 - Débitos de notas não processadas" },
    { value: "04", label: "04 - Multa e juros" },
    { value: "05", label: "05 - Transferência de crédito na sucessão" },
    { value: "06", label: "06 - Pagamento antecipado" },
    { value: "07", label: "07 - Perda em estoque" },
    { value: "08", label: "08 - Desenquadramento do Simples Nacional" },
] as const;

export const TIPOS_NOTA_CREDITO = [
    { value: "01", label: "01 - Multa e juros" },
    { value: "02", label: "02 - Crédito presumido na ZFM" },
    { value: "03", label: "03 - Retorno por recusa ou não localização" },
    { value: "04", label: "04 - Redução de valores" },
    { value: "05", label: "05 - Transferência de crédito na sucessão" },
] as const;