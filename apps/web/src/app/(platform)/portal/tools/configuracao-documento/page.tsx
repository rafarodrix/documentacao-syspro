import { redirect } from "next/navigation";

/** Alias legado: preferir `/portal/tools/configuracao-documentos`. */
export default function AdminConfiguracaoDocumentoLegacyPage() {
  redirect("/portal/tools/configuracao-documentos");
}
