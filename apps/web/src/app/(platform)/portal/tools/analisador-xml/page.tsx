import { Metadata } from "next";
import { AnalisadorXMLTool } from "@/components/platform/tools/analisador-xml/AnalisadorXMLTool";

export const metadata: Metadata = {
  title: "Analisador de XML Fiscal | Ferramentas Admin",
  description: "Ferramenta para validação de sequências numéricas e extração de documentos XML fiscais.",
};

export default function AnalisadorXMLAdmin() {
  return (
    <div className="flex-1 w-full">
      {/* O componente AnalisadorXMLTool já possui a tag <main> e 
         container styles, então basta renderizá-lo aqui.
      */}
      <AnalisadorXMLTool />
    </div>
  );
}