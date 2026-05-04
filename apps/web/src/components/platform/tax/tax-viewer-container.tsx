import { getTaxRulesViewData } from "@/features/tax/application/tax-read.queries";
import { TaxRulesViewer } from "./tax-rules-viewer";

export async function TaxViewerContainer() {
    const data = await getTaxRulesViewData();

    return <TaxRulesViewer data={data} />;
}
