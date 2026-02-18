import { Metadata } from "next";
import { AnalisadorXMLTool } from "@/components/platform/tools/analisador-xml/AnalisadorXMLTool";

export const metadata: Metadata = {
    title: "Analisador de XML Fiscal | Ferramentas",
    description: "Ferramenta para validacao de sequencias numericas e extracao de documentos XML fiscais.",
};

export default function AnalisadorXMLPage() {
    return (
        <div className="flex-1 w-full">
            <AnalisadorXMLTool />
        </div>
    );
}
