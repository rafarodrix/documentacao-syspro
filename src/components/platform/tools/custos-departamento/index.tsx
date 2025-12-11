'use client';

import { useState, useMemo, useEffect, useRef, ReactNode } from 'react';
import {
  Plus,
  Trash2,
  Target,
  Settings2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Calculator,
  RotateCcw,
  LayoutDashboard,
  Coins,
  ArrowRightLeft
} from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { FormattedCurrencyInput } from './CurrencyInput'; // Mantendo sua importação original

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================

type AllocationMode = 'auto' | 'manual';

export interface Department {
  id: number;
  name: string;
  totalRevenue: number;
  manualCost?: number;
}

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, name: 'FILTRO AR', totalRevenue: 36847 },
  { id: 2, name: 'FILTRO COMBUSTÍVEL', totalRevenue: 41007 },
  { id: 3, name: 'LUBRIFICANTE', totalRevenue: 146620.1 },
];

// Utilitários de Formatação
const formatCurrency = (val: number) =>
  isNaN(val) ? 'R$ 0,00' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (val: number) =>
  isNaN(val) ? '0,00%' : val.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });

// ============================================================================
// 2. UI ATOMS (Componentes Visuais Reutilizáveis)
// ============================================================================

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: ReactNode }) => (
  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
    <div className="flex items-center gap-2 text-slate-700 font-semibold">
      {Icon && <Icon className="w-5 h-5 text-slate-500" />}
      {title}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>{children}</span>;
};

// ============================================================================
// 3. SUB-COMPONENTS (Lógica de Negócio Modularizada)
// ============================================================================

// --- 3.1 Painel de KPIs (Métricas Principais) ---
interface KPIGridProps {
  totalCost: number;
  costTarget: number;
  currentCostPercent: number;
  onTotalCostChange: (val: string | undefined) => void;
  onTargetChange: (val: number) => void;
}

function KPIGrid({ totalCost, costTarget, currentCostPercent, onTotalCostChange, onTargetChange }: KPIGridProps) {
  // Lógica de Status
  const getStatus = () => {
    if (totalCost <= 0) return { label: 'Sem Dados', variant: 'neutral' as const, icon: AlertCircle };
    if (currentCostPercent > costTarget * 1.1) return { label: 'Crítico', variant: 'danger' as const, icon: AlertTriangle };
    if (currentCostPercent > costTarget) return { label: 'Atenção', variant: 'warning' as const, icon: AlertTriangle };
    return { label: 'Saudável', variant: 'success' as const, icon: ShieldCheck };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Input Principal */}
      <Card className="p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5"><Coins size={64} /></div>
        <label className="text-sm font-medium text-slate-500 mb-1">Custo Fixo Total (Meta)</label>
        <div className="relative z-10">
          <FormattedCurrencyInput
            value={totalCost}
            onValueChange={onTotalCostChange}
            className="text-2xl font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-slate-300"
          />
          <p className="text-xs text-slate-400 mt-1">Valor base para distribuição</p>
        </div>
      </Card>

      {/* Card 2: Meta Percentual */}
      <Card className="p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5"><Target size={64} /></div>
        <label className="text-sm font-medium text-slate-500 mb-1">Meta de Custo (%)</label>
        <div className="flex items-baseline gap-1 z-10">
          <input
            type="number"
            min="0"
            max="100"
            value={Math.round(costTarget * 100)}
            onChange={(e) => onTargetChange(parseFloat(e.target.value) / 100)}
            className="text-2xl font-bold text-slate-800 bg-transparent border-b border-slate-200 w-20 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <span className="text-lg text-slate-400 font-medium">%</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Limite ideal sobre faturamento</p>
      </Card>

      {/* Card 3: Status (Calculado) */}
      <Card className={`p-5 flex flex-col justify-between border-l-4 ${status.variant === 'success' ? 'border-l-emerald-500' :
          status.variant === 'warning' ? 'border-l-amber-500' :
            status.variant === 'danger' ? 'border-l-rose-500' : 'border-l-slate-300'
        }`}>
        <div className="flex justify-between items-start">
          <div>
            <label className="text-sm font-medium text-slate-500">Status Financeiro</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-800">{formatPercent(currentCostPercent)}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
          <StatusIcon className={`w-8 h-8 ${status.variant === 'success' ? 'text-emerald-500' :
              status.variant === 'warning' ? 'text-amber-500' :
                status.variant === 'danger' ? 'text-rose-500' : 'text-slate-300'
            }`} />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {currentCostPercent > costTarget
            ? `Excedendo meta em ${formatPercent(currentCostPercent - costTarget)}`
            : 'Dentro do limite estipulado'}
        </p>
      </Card>
    </div>
  );
}

// --- 3.2 Tabela de Departamentos ---
interface DepartmentTableProps {
  departments: Department[];
  allocationMode: AllocationMode;
  companyTotalFixedCost: number;
  totalRevenue: number;
  onUpdateDepartment: (id: number, field: keyof Department, value: any) => void;
  onDelete: (id: number) => void;
  lastAddedRef: React.Ref<HTMLInputElement>;
}

function DepartmentTable({
  departments,
  allocationMode,
  companyTotalFixedCost,
  totalRevenue,
  onUpdateDepartment,
  onDelete,
  lastAddedRef
}: DepartmentTableProps) {

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-medium uppercase text-xs tracking-wider">
          <tr>
            <th className="px-6 py-3 w-[35%]">Departamento</th>
            <th className="px-6 py-3 text-right">Faturamento</th>
            <th className="px-6 py-3 text-right">Participação</th>
            <th className="px-6 py-3 text-right bg-slate-100/50">
              {allocationMode === 'auto' ? (
                <span className="flex items-center justify-end gap-1"><Settings2 size={12} /> Alocação Auto</span>
              ) : (
                <span className="flex items-center justify-end gap-1"><Calculator size={12} /> Custo Manual</span>
              )}
            </th>
            <th className="px-4 py-3 text-center w-[50px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {departments.map((dept, index) => {
            const participation = totalRevenue > 0 ? dept.totalRevenue / totalRevenue : 0;
            const allocatedCost = allocationMode === 'auto'
              ? companyTotalFixedCost * participation
              : dept.manualCost || 0;

            return (
              <tr key={dept.id} className="group hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3">
                  <input
                    ref={index === departments.length - 1 ? lastAddedRef : null}
                    type="text"
                    value={dept.name}
                    onChange={(e) => onUpdateDepartment(dept.id, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-slate-700 font-medium py-1 transition-colors"
                    placeholder="Nome do departamento..."
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <FormattedCurrencyInput
                    value={dept.totalRevenue}
                    onValueChange={(val) => onUpdateDepartment(dept.id, 'totalRevenue', parseFloat(val || '0'))}
                    className="text-right bg-transparent w-full border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 text-slate-600"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <Badge variant="neutral">{formatPercent(participation)}</Badge>
                </td>
                <td className={`px-6 py-3 text-right font-medium ${allocationMode === 'auto' ? 'text-slate-500 bg-slate-50/30' : 'text-blue-600'}`}>
                  {allocationMode === 'auto' ? (
                    formatCurrency(allocatedCost)
                  ) : (
                    <FormattedCurrencyInput
                      value={dept.manualCost || 0}
                      onValueChange={(val) => onUpdateDepartment(dept.id, 'manualCost', parseFloat(val || '0'))}
                      className="text-right bg-white border border-slate-200 rounded px-2 py-1 w-28 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onDelete(dept.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {departments.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                Nenhum departamento cadastrado. Adicione um para começar.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
          <tr>
            <td className="px-6 py-3">Total</td>
            <td className="px-6 py-3 text-right">{formatCurrency(totalRevenue)}</td>
            <td className="px-6 py-3 text-right">100%</td>
            <td className="px-6 py-3 text-right">
              {allocationMode === 'auto'
                ? formatCurrency(companyTotalFixedCost)
                : formatCurrency(departments.reduce((acc, d) => acc + (d.manualCost || 0), 0))
              }
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// --- 3.3 Rodapé de Explicação Técnica ---
function CalculationFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <Calculator size={16} />
        {isOpen ? 'Ocultar detalhes do cálculo' : 'Como o cálculo é feito?'}
      </button>

      {isOpen && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div>
            <h4 className="font-semibold text-slate-800 mb-2 text-sm">Custo Automático (Rateio)</h4>
            <p className="text-xs text-slate-500 mb-3">O custo fixo é distribuído proporcionalmente com base na receita de cada departamento.</p>
            <div className="bg-white p-3 rounded border border-slate-200 text-xs">
              <BlockMath math={`P_{dept} = \\frac{Faturamento_{dept}}{Faturamento_{Total}}`} />
              <div className="h-2" />
              <BlockMath math={`Custo_{alocado} = Custo_{Total} \\times P_{dept}`} />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-2 text-sm">Modo Manual</h4>
            <p className="text-xs text-slate-500 mb-3">Permite override manual. Útil para simular cenários onde um departamento absorve mais custo independente da receita.</p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              <li>Valida se a soma manual bate com o custo total da empresa.</li>
              <li>Exibe saldo restante (positivo ou negativo) em tempo real.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. MAIN COMPONENT (Controller)
// ============================================================================

export function FixedCostSimulator() {
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [companyTotalFixedCost, setCompanyTotalFixedCost] = useState(103000);
  const [costTarget, setCostTarget] = useState(0.4); // 40%
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('auto');

  const lastAddedInputRef = useRef<HTMLInputElement>(null);

  // --- Cálculos Derivados ---
  const totalRevenue = useMemo(() => departments.reduce((sum, d) => sum + d.totalRevenue, 0), [departments]);
  const currentCostPercent = useMemo(() => (totalRevenue > 0 ? companyTotalFixedCost / totalRevenue : 0), [companyTotalFixedCost, totalRevenue]);

  // Apenas para modo manual
  const totalManualAllocated = useMemo(() => departments.reduce((sum, d) => sum + (d.manualCost || 0), 0), [departments]);
  const balanceToAllocate = companyTotalFixedCost - totalManualAllocated;

  // --- Actions ---
  const handleUpdateDepartment = (id: number, field: keyof Department, value: any) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleAddDepartment = () => {
    const newId = departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1;
    setDepartments([...departments, { id: newId, name: '', totalRevenue: 0 }]);
  };

  const handleDeleteDepartment = (id: number) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  const handleReset = () => {
    if (confirm('Isso irá restaurar os dados iniciais. Continuar?')) {
      setDepartments(INITIAL_DEPARTMENTS);
      setCompanyTotalFixedCost(103000);
      setAllocationMode('auto');
    }
  };

  // Efeito para focar no input novo
  useEffect(() => {
    if (departments.length > INITIAL_DEPARTMENTS.length) {
      lastAddedInputRef.current?.focus();
    }
  }, [departments.length]);

  // Efeito para limpar custos manuais ao voltar para auto
  useEffect(() => {
    if (allocationMode === 'auto') {
      setDepartments(prev => prev.map(d => ({ ...d, manualCost: undefined })));
    }
  }, [allocationMode]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            Simulador de Custos Fixos
          </h1>
          <p className="text-slate-500 mt-1">Gerenciamento estratégico de rateio por departamento</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <RotateCcw size={16} /> Restaurar Padrões
          </button>
        </div>
      </div>

      {/* Seção 1: Indicadores Globais */}
      <KPIGrid
        totalCost={companyTotalFixedCost}
        onTotalCostChange={(val) => setCompanyTotalFixedCost(parseFloat(val || '0'))}
        costTarget={costTarget}
        onTargetChange={setCostTarget}
        currentCostPercent={currentCostPercent}
      />

      {/* Seção 2: Gerenciamento (Tabela Principal) */}
      <Card>
        <CardHeader
          title="Detalhamento por Departamento"
          icon={BarChart3}
          action={
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setAllocationMode('auto')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${allocationMode === 'auto' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Settings2 size={14} /> Automático
              </button>
              <button
                onClick={() => setAllocationMode('manual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${allocationMode === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Calculator size={14} /> Manual
              </button>
            </div>
          }
        />

        {/* Barra de Alerta para Modo Manual */}
        {allocationMode === 'manual' && (
          <div className={`px-6 py-3 border-b flex items-center justify-between text-sm ${balanceToAllocate === 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
              balanceToAllocate > 0 ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} />
              <span className="font-semibold">Modo de Alocação Manual Ativo</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Total Empresa: <strong>{formatCurrency(companyTotalFixedCost)}</strong></span>
              <span>Alocado: <strong>{formatCurrency(totalManualAllocated)}</strong></span>
              <span className={`px-2 py-0.5 rounded border ${balanceToAllocate === 0 ? 'bg-emerald-200/50 border-emerald-300' : 'bg-white border-current'
                }`}>
                Restante: <strong>{formatCurrency(balanceToAllocate)}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="p-0">
          <DepartmentTable
            departments={departments}
            allocationMode={allocationMode}
            companyTotalFixedCost={companyTotalFixedCost}
            totalRevenue={totalRevenue}
            onUpdateDepartment={handleUpdateDepartment}
            onDelete={handleDeleteDepartment}
            lastAddedRef={lastAddedInputRef}
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30 rounded-b-xl flex justify-center">
          <button
            onClick={handleAddDepartment}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium"
          >
            <div className="bg-slate-100 group-hover:bg-blue-100 rounded-full p-1 transition-colors">
              <Plus size={14} />
            </div>
            Adicionar Novo Departamento
          </button>
        </div>
      </Card>

      <CalculationFooter />
    </div>
  );
}