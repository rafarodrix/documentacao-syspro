import { CalculadoraDifal } from "@/components/platform/tools/CalculadoraDifal";

export default function ClientCalculadoraPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minha Calculadora</h1>
      </div>
      <CalculadoraDifal />
    </div>
  );
}