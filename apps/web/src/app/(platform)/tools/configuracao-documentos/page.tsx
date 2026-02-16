import { Metadata } from "next";
import ConfiguracaoDocumentos from "@/components/platform/tools/configuracao-documentos/documentos";

export const metadata: Metadata = {
    title: "Configuracao de Documentos | Syspro",
    description: "Gerencie os parametros de emissao e regras fiscais.",
};

export default function ConfiguracaoDocumentosPage() {
    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Configuracao de Documentos</h1>
                <p className="text-muted-foreground mt-1">
                    Defina os modelos de notas fiscais e regras de movimentacao de estoque.
                </p>
            </div>
            <ConfiguracaoDocumentos />
        </div>
    );
}
