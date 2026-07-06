import { Metadata } from "next";
import DocumentosContainer from "@/components/platform/tools/configuracao-documentos/documentos";

export const metadata: Metadata = {
    title: "Configuração de Documentos | Syspro",
    description: "Gerencie os parâmetros de emissão e regras fiscais.",
};

export default function AdminConfiguracaoDocumentosToolPage() {
    return (
        <div className="w-full max-w-400 mx-auto">
            <DocumentosContainer />
        </div>
    );
}
