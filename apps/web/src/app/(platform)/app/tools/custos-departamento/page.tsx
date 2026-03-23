import { FixedCostSimulator } from "@/components/platform/tools/custos-departamento";

export default function AdminFixedCostSimulatorPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Simulador de Custos Fixos por departamento</h1>
      </div>
      <FixedCostSimulator />
    </div>
  );
}