import React from 'react';
import { DocumentoFormValues } from "@/core/application/schema/documento-schema";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";
import { COMPORTAMENTOS_DOCUMENTO } from "@/core/constants/comportamentos-documento";

interface PrintableConfigProps {
    data: DocumentoFormValues;
}

// Usamos forwardRef para que a lib de impressão consiga capturar este componente
export const PrintableConfig = React.forwardRef<HTMLDivElement, PrintableConfigProps>(({ data }, ref) => {

    // Helper para achar label do grupo
    const grupoLabel = GRUPOS_DOCUMENTO.find(g => g.value === data.grupoDocumento)?.label || data.grupoDocumento;

    return (
        <div ref={ref} className="p-8 font-sans text-black bg-white print-content">
            <style type="text/css" media="print">
                {`@page { size: A4; margin: 20mm; }`}
            </style>

            {/* Cabeçalho */}
            <div className="border-b-2 border-black pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase">Ficha de Parametrização ERP</h1>
                <p className="text-sm text-gray-600">Documento Técnico de Configuração Fiscal</p>
                <div className="flex justify-between mt-2 text-sm">
                    <span><strong>Data:</strong> {new Date().toLocaleDateString()}</span>
                    <span><strong>ID Modelo:</strong> {data.id || "Novo (Não salvo)"}</span>
                </div>
            </div>

            {/* Tabela de Dados Gerais */}
            <div className="mb-6">
                <h3 className="bg-gray-200 p-2 font-bold uppercase text-sm border border-gray-400">Dados Gerais</h3>
                <table className="w-full border-collapse text-sm">
                    <tbody>
                        <tr className="border border-gray-300"><td className="p-2 font-bold w-1/3">Descrição:</td><td className="p-2">{data.descricao}</td></tr>
                        <tr className="border border-gray-300"><td className="p-2 font-bold">Grupo de Negócio:</td><td className="p-2">{data.grupoDocumento} - {grupoLabel}</td></tr>
                        <tr className="border border-gray-300"><td className="p-2 font-bold">Modelo / Série:</td><td className="p-2">{data.modelo} / {data.serie}</td></tr>
                        <tr className="border border-gray-300"><td className="p-2 font-bold">Movimenta Estoque:</td><td className="p-2">{data.movimentaEstoque}</td></tr>
                        <tr className="border border-gray-300"><td className="p-2 font-bold">Finalidade NFe:</td><td className="p-2">{data.finalidadeNFe}</td></tr>
                    </tbody>
                </table>
            </div>

            {/* Fiscal */}
            <div className="mb-6">
                <h3 className="bg-gray-200 p-2 font-bold uppercase text-sm border border-gray-400">Parâmetros Fiscais (CFOP)</h3>
                <div className="flex border border-gray-300 p-4 gap-8">
                    <div>
                        <span className="block font-bold text-xs uppercase text-gray-500">Estadual</span>
                        <span className="text-lg font-mono">{data.cfopEstadual || "---"}</span>
                    </div>
                    <div>
                        <span className="block font-bold text-xs uppercase text-gray-500">Interestadual</span>
                        <span className="text-lg font-mono">{data.cfopInterestadual || "---"}</span>
                    </div>
                </div>
            </div>

            {/* Comportamentos (Checklist) */}
            <div className="mb-8">
                <h3 className="bg-gray-200 p-2 font-bold uppercase text-sm border border-gray-400">Automação e Regras (Comportamentos)</h3>
                <ul className="mt-2 border border-gray-300">
                    {data.comportamentos && data.comportamentos.length > 0 ? (
                        data.comportamentos.map(code => {
                            const comp = COMPORTAMENTOS_DOCUMENTO.find(c => c.id === code);
                            return (
                                <li key={code} className="p-2 border-b border-gray-100 flex items-center gap-2 text-sm">
                                    <span className="text-xs font-bold border border-black px-1 rounded">{code}</span>
                                    <span>{comp?.label || "Comportamento desconhecido"}</span>
                                </li>
                            )
                        })
                    ) : (
                        <li className="p-4 text-gray-500 italic text-center">Nenhum comportamento selecionado.</li>
                    )}
                </ul>
            </div>

            {/* Assinatura */}
            <div className="mt-12 pt-8 border-t border-black flex justify-between gap-10">
                <div className="w-1/2 text-center">
                    <div className="border-b border-black mb-2"></div>
                    <p className="text-xs uppercase">Consultor Responsável</p>
                </div>
                <div className="w-1/2 text-center">
                    <div className="border-b border-black mb-2"></div>
                    <p className="text-xs uppercase">Cliente (De Acordo)</p>
                </div>
            </div>
        </div>
    );
});

PrintableConfig.displayName = "PrintableConfig";