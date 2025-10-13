'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Trash2,
  Target,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Briefcase,
  BarChart2,
  HelpCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { FormattedCurrencyInput } from './CurrencyInput';

// ------------------------------------------------------------
// Tipos e Constantes
// ------------------------------------------------------------
type AllocationMode = 'auto' | 'manual';

interface Department {
  id: number;
  name: string;
  totalRevenue: number;
  manualCost?: number;
}

const initialDepartments: Department[] = [
  { id: 1, name: 'FILTRO AR', totalRevenue: 36847 },
  { id: 2, name: 'FILTRO COMBUSTÍVEL', totalRevenue: 41007 },
  { id: 3, name: 'LUBRIFICANTE', totalRevenue: 146620.1 },
];

const formatCurrency = (value: number) =>
  isNaN(value) ? 'R$ 0,00' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (value: number) =>
  isNaN(value)
    ? '0,00%'
    : value.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });

// ------------------------------------------------------------
// Subcomponente: HealthStatus (Mantido como estava)
// ------------------------------------------------------------
function HealthStatus({ current, target }: { current: number; target: number }) {
  if (target <= 0 || current <= 0 || isNaN(current)) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border h-full">
        <div>
          <p className="text-sm text-muted-foreground">Status Financeiro</p>
          <p className="text-lg font-semibold">Aguardando dados...</p>
        </div>
      </div>
    );
  }

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (current > target * 1.1) status = 'critical';
  else if (current > target) status = 'warning';

  const config = {
    healthy: { icon: ShieldCheck, label: 'Saudável', color: 'text-green-500' },
    warning: { icon: AlertTriangle, label: 'Atenção', color: 'text-amber-500' },
    critical: { icon: Zap, label: 'Crítico', color: 'text-red-500' },
  }[status];

  const { icon: Icon, label, color } = config;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border h-full">
      <Icon className={`h-8 w-8 ${color}`} />
      <div>
        <p className="text-sm text-muted-foreground">Status Financeiro</p>
        <p className={`text-lg font-semibold ${color}`}>{label}</p>
      </div>
    </div>
  );
}

// ============================================================
// NOVO SUBCOMPONENTE: PASSO 1
// ============================================================
interface Step1Props {
  totalCost: number;
  onTotalCostChange: (value?: string) => void;
  costTarget: number;
  onCostTargetChange: (value: number) => void;
  totalCostPercent: number;
  onClear: () => void;
}

function Step1_GeneralData({
  totalCost,
  onTotalCostChange,
  costTarget,
  onCostTargetChange,
  totalCostPercent,
  onClear,
}: Step1Props) {
  return (
    <section className="bg-card border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Briefcase size={20} /> Passo 1: Dados Gerais e Metas
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Informe o custo fixo total e a meta de custo sobre o faturamento.
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
        >
          <X size={16} /> Limpar Dados
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="total-cost" className="font-medium text-muted-foreground text-sm">
            Custo Fixo Total (R$)
          </label>
          <FormattedCurrencyInput
            id="total-cost"
            value={totalCost}
            onValueChange={onTotalCostChange}
            className="p-3 text-lg font-semibold mt-1"
          />
        </div>
        <div>
          <label htmlFor="target-cost" className="font-medium text-muted-foreground text-sm flex items-center gap-1.5">
            <Target size={14} /> Meta de Custo Fixo (%)
          </label>
          <div className="relative">
            <input
              id="target-cost"
              type="number"
              min="0"
              max="100"
              value={costTarget * 100}
              onChange={(e) => onCostTargetChange((parseFloat(e.target.value) || 0) / 100)}
              className="mt-1 w-full p-2 bg-background border rounded-md font-semibold text-lg pr-8"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">%</span>
          </div>
        </div>
        <HealthStatus current={totalCostPercent} target={costTarget} />
      </div>
    </section>
  );
}

// ============================================================
// NOVO SUBCOMPONENTE: PASSO 2
// ============================================================
interface Step2Props {
  departments: Department[];
  allocationMode: AllocationMode;
  onAllocationModeChange: (mode: AllocationMode) => void;
  companyTotalFixedCost: number;
  totalRevenue: number;
  totalManualCost: number;
  balanceToAllocate: number;
  onAddDepartment: () => void;
  onDeleteDepartment: (id: number) => void;
  onNameChange: (id: number, name: string) => void;
  onRevenueChange: (id: number, value?: string) => void;
  onManualCostChange: (id: number, value?: string) => void;
  lastAddedInputRef: React.Ref<HTMLInputElement>;
}

function Step2_DepartmentManagement({
  departments,
  allocationMode,
  onAllocationModeChange,
  companyTotalFixedCost,
  totalRevenue,
  totalManualCost,
  balanceToAllocate,
  onAddDepartment,
  onDeleteDepartment,
  onNameChange,
  onRevenueChange,
  onManualCostChange,
  lastAddedInputRef,
}: Step2Props) {
  return (
    <section className="bg-card border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <BarChart2 size={20} /> Passo 2: Gerencie e Simule Departamentos
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        Adicione, edite e remova departamentos. Altere o modo de alocação para simular diferentes cenários.
      </p>

      {/* Seletor de Modo */}
      <div className="flex justify-center gap-2 my-4 p-1 rounded-lg bg-muted w-fit mx-auto">
        {(['auto', 'manual'] as AllocationMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onAllocationModeChange(mode)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
              allocationMode === mode
                ? 'bg-background shadow text-primary'
                : 'text-muted-foreground hover:bg-background/50'
            }`}
          >
            {mode === 'auto' ? 'Automático' : 'Manual'}
          </button>
        ))}
      </div>

      {/* Sumário do Modo Manual */}
      {allocationMode === 'manual' && (
        <div className="grid md:grid-cols-3 gap-4 mb-6 text-center">
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-muted-foreground text-sm">Total Manual</p>
            <p className="text-lg font-semibold">{formatCurrency(totalManualCost)}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-muted-foreground text-sm">Custo Fixo Total</p>
            <p className="text-lg font-semibold">{formatCurrency(companyTotalFixedCost)}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-muted-foreground text-sm">Saldo a Alocar</p>
            <p className={`text-lg font-semibold ${balanceToAllocate < 0 ? 'text-red-500' : 'text-primary'}`}>
              {formatCurrency(balanceToAllocate)}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Departamentos */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 text-left">Departamento</th>
              <th className="p-3 text-right">Faturamento (R$)</th>
              <th className="p-3 text-right">% Participação</th>
              <th className="p-3 text-right">Custo Fixo</th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, i) => {
              const participacao = totalRevenue > 0 ? dept.totalRevenue / totalRevenue : 0;
              const custoFixo =
                allocationMode === 'auto'
                  ? companyTotalFixedCost * participacao
                  : dept.manualCost || 0;
              return (
                <tr key={dept.id} className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                  <td className="p-2 w-2/5">
                    <input
                      ref={i === departments.length - 1 ? lastAddedInputRef : null}
                      type="text"
                      placeholder="Nome do Departamento"
                      value={dept.name}
                      onChange={(e) => onNameChange(dept.id, e.target.value)}
                      className="w-full bg-background/50 p-2 rounded-md border focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <FormattedCurrencyInput
                      value={dept.totalRevenue}
                      onValueChange={(value) => onRevenueChange(dept.id, value)}
                      className="text-right p-2"
                    />
                  </td>
                  <td className="p-3 text-right font-mono">{formatPercent(participacao)}</td>
                  <td className="p-2">
                    {allocationMode === 'manual' ? (
                      <FormattedCurrencyInput
                        value={dept.manualCost || 0}
                        onValueChange={(value) => onManualCostChange(dept.id, value)}
                        className="text-right p-2"
                      />
                    ) : (
                      <p className="text-right font-semibold text-primary">{formatCurrency(custoFixo)}</p>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteDepartment(dept.id)}
                      title="Remover Departamento"
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onAddDepartment}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <PlusCircle className="w-4 h-4" /> Adicionar Departamento
      </button>
    </section>
  );
}

// ============================================================
// NOVO SUBCOMPONENTE: EXPLICAÇÕES
// ============================================================
function CalculationsExplanation() {
  return (
    <details className="text-sm group bg-card border rounded-lg p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
        <HelpCircle size={16} /> Entendendo os Cálculos
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
      </summary>
      <div className="mt-4 border-t pt-4 space-y-3 text-muted-foreground animate-fade-in">
        <p>
          <strong>% Participação:</strong> representa o peso do faturamento do departamento sobre o total.
        </p>
        <div className="p-3 bg-background rounded-md text-center">
          <BlockMath math={`P_{dept} = \\frac{Faturamento_{dept}}{Faturamento_{Total}}`} />
        </div>
        <p>
          <strong>Custo Fixo Alocado:</strong> no modo automático, é calculado proporcionalmente à participação no faturamento.
        </p>
        <div className="p-3 bg-background rounded-md text-center">
          <BlockMath math={`CustoFixo_{dept} = CustoFixo_{Total} \\times P_{dept}`} />
        </div>
      </div>
    </details>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL (CONTAINER)
// ============================================================
export function FixedCostSimulator() {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [companyTotalFixedCost, setCompanyTotalFixedCost] = useState(103000);
  const [costTarget, setCostTarget] = useState(0.4);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('auto');
  const lastAddedInputRef = useRef<HTMLInputElement>(null);

  // --- Cálculos Principais (Mantidos no componente pai) ---
  const totalRevenue = useMemo(() => departments.reduce((sum, d) => sum + d.totalRevenue, 0), [departments]);
  const totalCostPercent = useMemo(
    () => (totalRevenue > 0 ? companyTotalFixedCost / totalRevenue : 0),
    [companyTotalFixedCost, totalRevenue]
  );
  const totalManualCost = useMemo(() => departments.reduce((sum, d) => sum + (d.manualCost || 0), 0), [departments]);
  const balanceToAllocate = companyTotalFixedCost - totalManualCost;

  // --- Manipuladores (Mantidos no componente pai) ---
  const handleRevenueChange = (id: number, value?: string) =>
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, totalRevenue: parseFloat(value || '0') } : d))
    );

  const handleManualCostChange = (id: number, value?: string) =>
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, manualCost: parseFloat(value || '0') } : d))
    );

  const handleAddDepartment = () => {
    const newId = departments.length ? Math.max(...departments.map((d) => d.id)) + 1 : 1;
    setDepartments([...departments, { id: newId, name: '', totalRevenue: 0 }]);
  };

  const handleDeleteDepartment = (id: number) => setDepartments((prev) => prev.filter((d) => d.id !== id));

  const handleNameChange = (id: number, name: string) =>
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));

  const handleClear = () => {
    setDepartments(initialDepartments);
    setCompanyTotalFixedCost(103000);
    setCostTarget(0.4);
    setAllocationMode('auto');
  };

  // --- Efeitos (Mantidos no componente pai) ---
  useEffect(() => {
    if (allocationMode === 'auto') {
      setDepartments((prev) => prev.map((d) => ({ ...d, manualCost: undefined })));
    }
  }, [allocationMode]);

  useEffect(() => {
    lastAddedInputRef.current?.focus();
  }, [departments.length]);

  // ------------------------------------------------------------
  // Renderização usando os novos subcomponentes
  // ------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Step1_GeneralData
        totalCost={companyTotalFixedCost}
        onTotalCostChange={(value) => setCompanyTotalFixedCost(parseFloat(value || '0'))}
        costTarget={costTarget}
        onCostTargetChange={setCostTarget}
        totalCostPercent={totalCostPercent}
        onClear={handleClear}
      />

      <Step2_DepartmentManagement
        departments={departments}
        allocationMode={allocationMode}
        onAllocationModeChange={setAllocationMode}
        companyTotalFixedCost={companyTotalFixedCost}
        totalRevenue={totalRevenue}
        totalManualCost={totalManualCost}
        balanceToAllocate={balanceToAllocate}
        onAddDepartment={handleAddDepartment}
        onDeleteDepartment={handleDeleteDepartment}
        onNameChange={handleNameChange}
        onRevenueChange={handleRevenueChange}
        onManualCostChange={handleManualCostChange}
        lastAddedInputRef={lastAddedInputRef}
      />

      <CalculationsExplanation />
    </div>
  );
}