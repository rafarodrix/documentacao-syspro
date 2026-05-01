import { getTaxRulesViewData } from "@/features/tax/application/tax-read.queries";
import { TaxRulesViewer } from "./TaxRulesViewer";

export async function TaxViewerContainer() {
    const data = await getTaxRulesViewData();

    return <TaxRulesViewer data={data} />;
}
