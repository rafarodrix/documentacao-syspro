import React from 'react';
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";
import { COMPORTAMENTOS_DOCUMENTO } from "@/core/constants/comportamentos-documento";
import { TIPOS_NOTA_CREDITO, TIPOS_NOTA_DEBITO } from "@/core/constants/tipos-notas";

interface PrintableConfigProps {
    data: DocumentoFormValues;
}

export const PrintableConfig = React.forwardRef<HTMLDivElement, PrintableConfigProps>(({ data }, ref) => {

    const grupoLabel = GRUPOS_DOCUMENTO.find(g => g.value === data.grupoDocumento)?.label || data.grupoDocumento;

    // Helper para labels de Crédito/Débito
    const getFinalidadeLabel = (cod: string) => {
        if (cod === "5") {
            const motivo = TIPOS_NOTA_CREDITO.find(t => t.value === data.tpNFCredito)?.label;
            return `Nota de Crédito - ${motivo || "Motivo não informado"}`;
        }
        if (cod === "6") {
            const motivo = TIPOS_NOTA_DEBITO.find(t => t.value === data.tpNFDebito)?.label;
            return `Nota de Débito - ${motivo || "Motivo não informado"}`;
        }
        const map = { "1": "Normal", "2": "Complementar", "3": "Ajuste", "4": "Devolução" };
        return map[cod as keyof typeof map] || cod;
    };

    return (
        <div ref={ref} className="p-8 font-sans text-black bg-white print-content">
            <style type="text/css" media="print">
                {`@page { size: A4; margin: 15mm; } body { -webkit-print-color-adjust: exact; }`}
            </style>

            {/* Cabeçalho */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight">Ficha de Parametrização</h1>
                    <p className="text-sm text-gray-600">Configuração de Modelo Fiscal ERP</p>
                </div>
                <div className="text-right text-xs">
                    <p><strong>Emissão:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>ID:</strong> {data.id?.substring(0, 8) || "NOVO"}</p>
                </div>
            </div>

            {/* 1. Dados Gerais */}
            <div className="mb-6">
                <h3 className="bg-gray-100 p-2 font-bold uppercase text-xs border border-gray-300 mb-2">1. Identificação do Modelo</h3>
                <table className="w-full text-sm border border-gray-300">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 font-bold bg-gray-50 w-1/4">Descrição Interna:</td>
                            <td className="p-2 font-medium" colSpan={3}>{data.descricao}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 font-bold bg-gray-50">Grupo de Negócio:</td>
                            <td className="p-2" colSpan={3}>{data.grupoDocumento} - {grupoLabel}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 font-bold bg-gray-50">Modelo Fiscal:</td>
                            <td className="p-2">{data.modelo}</td>
                            <td className="p-2 font-bold bg-gray-50 w-1/4">Série:</td>
                            <td className="p-2">{data.serie}</td>
                        </tr>
                        <tr>
                            <td className="p-2 font-bold bg-gray-50">Movimenta Estoque:</td>
                            <td className="p-2">{data.movimentaEstoque}</td>
                            <td className="p-2 font-bold bg-gray-50">Finalidade:</td>
                            <td className="p-2">{getFinalidadeLabel(data.finalidadeNFe)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Matriz Fiscal (CFOPs) */}
            <div className="mb-6">
                <h3 className="bg-gray-100 p-2 font-bold uppercase text-xs border border-gray-300 mb-2">2. Matriz de CFOPs Sugeridos</h3>
                <table className="w-full text-sm border border-gray-300 text-center">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-300">
                            <th className="p-2 text-left">Cenário Fiscal</th>
                            <th className="p-2 border-l border-gray-300">Estadual (Interno)</th>
                            <th className="p-2 border-l border-gray-300">Interestadual (Externo)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-left font-bold">1. Tributação Normal</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopEstadual || "-"}</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopInterestadual || "-"}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-left font-bold">2. Substituição Tributária (ST)</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopEstadualST || "-"}</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopInterestadualST || "-"}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="p-2 text-left font-bold">3. Consumidor Final</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopEstadualConsumidor || "-"}</td>
                            <td className="p-2 border-l border-gray-200 font-mono">{data.cfopInterestadualConsumidor || "-"}</td>
                        </tr>
                        <tr>
                            <td className="p-2 text-left font-bold">4. Exterior (Exportação)</td>
                            <td className="p-2 border-l border-gray-200 font-mono" colSpan={2}>{data.cfopInternacional || "-"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 3. Regras e Comportamentos */}
            <div className="mb-8">
                <h3 className="bg-gray-100 p-2 font-bold uppercase text-xs border border-gray-300 mb-2">3. Regras de Automação (Checklist)</h3>

                {data.comportamentos && data.comportamentos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs border border-gray-300 p-4">
                        {data.comportamentos.map(code => {
                            const comp = COMPORTAMENTOS_DOCUMENTO.find(c => c.id === code);
                            return (
                                <div key={code} className="flex items-start gap-2">
                                    <span className="font-bold min-w-[40px] text-gray-600">[{code}]</span>
                                    <span>{comp?.label || "Comportamento não catalogado"}</span>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="border border-gray-300 p-4 text-center text-gray-500 italic text-sm">
                        Nenhuma regra de automação vinculada a este modelo.
                    </div>
                )}
            </div>

            {/* Rodapé / Assinatura */}
            <div className="mt-16 pt-8 border-t border-black grid grid-cols-2 gap-16">
                <div>
                    <div className="border-b border-black mb-2"></div>
                    <p className="text-xs uppercase font-bold text-center">Responsável Técnico (TI/Consultoria)</p>
                </div>
                <div>
                    <div className="border-b border-black mb-2"></div>
                    <p className="text-xs uppercase font-bold text-center">Responsável Fiscal (Aprovação)</p>
                </div>
            </div>
        </div>
    );
});

PrintableConfig.displayName = "PrintableConfig";