import { CalculadoraDifal } from "@/components/platform/tools/calculadora-difal/CalculadoraDifal";

export default function AdminCalculadoraPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculadora DIFAL (Modo Admin)</h1>
      </div>
      <CalculadoraDifal />
    </div>
  );
}