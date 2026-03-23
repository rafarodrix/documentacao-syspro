import { CalculadoraPrecificacao } from "@/components/platform/tools/calculadora-precificacao";

export default function AdminCalculadoraPrecificacaoPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculadora de Precificação</h1>
      </div>
      <CalculadoraPrecificacao />
    </div>
  );
}