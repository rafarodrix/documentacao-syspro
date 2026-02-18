import { CalculadoraDifal } from "@/components/platform/tools/calculadora-difal";

export default function AppCalculadoraDifalPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculadora DIFAL</h1>
      </div>
      <CalculadoraDifal />
    </div>
  );
}