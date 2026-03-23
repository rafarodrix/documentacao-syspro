import { getTaxCredPresumidoViewData } from "@/features/tax/application/queries";
import { TaxCredPresumidoPanel } from "./TaxCredPresumidoPanel";

export async function TaxCredPresumidoContainer() {
  try {
    const items = await getTaxCredPresumidoViewData();

    return <TaxCredPresumidoPanel items={items} />;
  } catch (error) {
    console.error("Erro ao carregar credito presumido:", error);
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Nao foi possivel carregar os dados de credito presumido. Verifique se a migration foi aplicada no banco.
      </div>
    );
  }
}
