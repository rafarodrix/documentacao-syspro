import { Metadata } from "next";
import ConfiguracaoDocumentos from "@/components/platform/tools/configuracao-documentos/documentos";

// 1. Define o título da aba do navegador
export const metadata: Metadata = {
  title: "Configuração de Documentos | Syspro",
  description: "Gerencie os parâmetros de emissão e regras fiscais.",
};

export default function AppConfiguracaoDocumentosToolPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configuração de Documentos</h1>
        <p className="text-slate-500 mt-1">
          Defina os modelos de notas fiscais e regras de movimentação de estoque.
        </p>
      </div>

      <ConfiguracaoDocumentos />
    </div>
  );
}