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
  ArrowRightLeft,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { FormattedCurrencyInput } from '@/components/platform/tools/custos-departamento/CurrencyInput';

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================

// Adicionado 'strategic' aos modos
type AllocationMode = 'auto' | 'manual' | 'strategic';

export interface Department {
  id: number;
  name: string;
  totalRevenue: number;
  manualCost?: number;
  strategicTargetPercent?: number; // Novo campo para o modo estratégico
}

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, name: 'FILTRO AR', totalRevenue: 36847, strategicTargetPercent: 0 },
  { id: 2, name: 'FILTRO COMBUSTÍVEL', totalRevenue: 41007, strategicTargetPercent: 0 },
  { id: 3, name: 'LUBRIFICANTE', totalRevenue: 146620.1, strategicTargetPercent: 0 },
];

const formatCurrency = (val: number) =>
  isNaN(val) ? 'R$ 0,00' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (val: number) =>
  isNaN(val) ? '0,00%' : val.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });

// ============================================================================
// 2. UI ATOMS
// ============================================================================

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-card text-card-foreground border border-border rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: ReactNode }) => (
  <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/40 rounded-t-xl">
    <div className="flex items-center gap-2 text-foreground font-semibold">
      {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
      {title}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' }) => {
  const styles = {
    default: 'bg-secondary text-secondary-foreground',
    neutral: 'bg-muted text-muted-foreground border border-border',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>{children}</span>;
};

// ============================================================================
// 3. SUB-COMPONENTS
// ============================================================================

// --- 3.1 Painel de KPIs ---
interface KPIGridProps {
  totalCost: number;
  costTarget: number;
  currentCostPercent: number;
  onTotalCostChange: (val: string | undefined) => void;
  onTargetChange: (val: number) => void;
}

function KPIGrid({ totalCost, costTarget, currentCostPercent, onTotalCostChange, onTargetChange }: KPIGridProps) {
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
      <Card className="p-5 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
        <div className="absolute top-0 right-0 p-3 opacity-5 dark:opacity-10 text-primary"><Coins size={64} /></div>
        <label className="text-sm font-medium text-muted-foreground mb-1">Custo Fixo Total (Meta)</label>
        <div className="relative z-10">
          <FormattedCurrencyInput
            value={totalCost}
            onValueChange={onTotalCostChange}
            className="text-2xl font-bold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder:text-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">Valor base para distribuição</p>
        </div>
      </Card>

      <Card className="p-5 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
        <div className="absolute top-0 right-0 p-3 opacity-5 dark:opacity-10 text-primary"><Target size={64} /></div>
        <label className="text-sm font-medium text-muted-foreground mb-1">Meta Global de Custo (%)</label>
        <div className="flex items-baseline gap-1 z-10">
          <input
            type="number"
            min="0"
            max="100"
            value={Math.round(costTarget * 100)}
            onChange={(e) => onTargetChange(parseFloat(e.target.value) / 100)}
            className="text-2xl font-bold text-foreground bg-transparent border-b border-border w-20 focus:outline-none focus:border-primary transition-colors"
          />
          <span className="text-lg text-muted-foreground font-medium">%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Limite ideal sobre faturamento total</p>
      </Card>

      <Card className={`p-5 flex flex-col justify-between border-l-4 ${status.variant === 'success' ? 'border-l-emerald-500' :
        status.variant === 'warning' ? 'border-l-amber-500' :
          status.variant === 'danger' ? 'border-l-rose-500' : 'border-l-muted'
        }`}>
        <div className="flex justify-between items-start">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status Global</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{formatPercent(currentCostPercent)}</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
          </div>
          <StatusIcon className={`w-8 h-8 ${status.variant === 'success' ? 'text-emerald-500' :
            status.variant === 'warning' ? 'text-amber-500' :
              status.variant === 'danger' ? 'text-rose-500' : 'text-muted-foreground'
            }`} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
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
        <thead className="bg-muted/50 border-y border-border text-muted-foreground font-medium uppercase text-xs tracking-wider">
          <tr>
            <th className="px-6 py-3 w-[30%]">Departamento</th>
            <th className="px-6 py-3 text-right">Faturamento</th>

            {/* Coluna Dinâmica Baseada no Modo */}
            <th className="px-6 py-3 text-right">
              {allocationMode === 'strategic' ? (
                <span className="text-purple-600 font-bold">Meta de Absorção (%)</span>
              ) : (
                'Participação (%)'
              )}
            </th>

            <th className="px-6 py-3 text-right bg-muted/30">
              Custo Fixo Alocado
            </th>
            <th className="px-4 py-3 text-center w-[50px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {departments.map((dept, index) => {
            const revenueShare = totalRevenue > 0 ? dept.totalRevenue / totalRevenue : 0;

            // Lógica Central de Cálculo por Modo
            let allocatedCost = 0;
            let displayPercent = 0;

            if (allocationMode === 'auto') {
              allocatedCost = companyTotalFixedCost * revenueShare;
              displayPercent = revenueShare;
            } else if (allocationMode === 'manual') {
              allocatedCost = dept.manualCost || 0;
              displayPercent = dept.totalRevenue > 0 ? allocatedCost / dept.totalRevenue : 0;
            } else if (allocationMode === 'strategic') {
              // Modo Estratégico: Input é a %, Custo é a consequência
              displayPercent = (dept.strategicTargetPercent || 0) / 100;
              allocatedCost = dept.totalRevenue * displayPercent;
            }

            return (
              <tr key={dept.id} className="group hover:bg-muted/50 transition-colors">
                <td className="px-6 py-3">
                  <input
                    ref={index === departments.length - 1 ? lastAddedRef : null}
                    type="text"
                    value={dept.name}
                    onChange={(e) => onUpdateDepartment(dept.id, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground font-medium py-1 transition-colors placeholder:text-muted-foreground/50"
                    placeholder="Nome..."
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <FormattedCurrencyInput
                    value={dept.totalRevenue}
                    onValueChange={(val) => onUpdateDepartment(dept.id, 'totalRevenue', parseFloat(val || '0'))}
                    className="text-right bg-transparent w-full border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1 text-muted-foreground focus:text-foreground transition-colors"
                  />
                </td>

                {/* Coluna de Porcentagem / Input Estratégico */}
                <td className="px-6 py-3 text-right">
                  {allocationMode === 'strategic' ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={dept.strategicTargetPercent || 0}
                        onChange={(e) => onUpdateDepartment(dept.id, 'strategicTargetPercent', parseFloat(e.target.value))}
                        className="text-right bg-background border border-purple-200 dark:border-purple-800 rounded px-2 py-1 w-20 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none font-bold text-purple-700 dark:text-purple-400"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <Badge variant="neutral">{formatPercent(displayPercent)}</Badge>
                  )}
                </td>

                <td className={`px-6 py-3 text-right font-medium ${allocationMode === 'manual' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {allocationMode === 'manual' ? (
                    <FormattedCurrencyInput
                      value={dept.manualCost || 0}
                      onValueChange={(val) => onUpdateDepartment(dept.id, 'manualCost', parseFloat(val || '0'))}
                      className="text-right bg-background border border-border rounded px-2 py-1 w-28 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <span className={allocationMode === 'strategic' ? 'text-purple-700 dark:text-purple-400 font-semibold' : ''}>
                      {formatCurrency(allocatedCost)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onDelete(dept.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/30 border-t border-border font-semibold text-foreground">
          <tr>
            <td className="px-6 py-3">Total</td>
            <td className="px-6 py-3 text-right">{formatCurrency(totalRevenue)}</td>
            <td className="px-6 py-3 text-right">
              {/* Média ponderada ou Vazio */}
              -
            </td>
            <td className="px-6 py-3 text-right">
              {allocationMode === 'auto'
                ? formatCurrency(companyTotalFixedCost)
                : allocationMode === 'manual'
                  ? formatCurrency(departments.reduce((acc, d) => acc + (d.manualCost || 0), 0))
                  : formatCurrency(departments.reduce((acc, d) => acc + (d.totalRevenue * ((d.strategicTargetPercent || 0) / 100)), 0))
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
    <div className="mt-8 border-t border-border pt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Calculator size={16} />
        {isOpen ? 'Ocultar detalhes do cálculo' : 'Como os cálculos são feitos?'}
      </button>

      {isOpen && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-6 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
          <div>
            <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
              <Settings2 size={14} /> Rateio Automático (Padrão)
            </h4>
            <p className="text-xs text-muted-foreground mb-3">Distribuição puramente matemática baseada no volume de vendas.</p>
            <div className="bg-background p-3 rounded border border-border text-xs text-foreground">
              <BlockMath math={`Custo = CustoTotal \\times \\frac{Fat_{Dept}}{Fat_{Total}}`} />
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
              <Calculator size={14} /> Alocação Manual (R$)
            </h4>
            <p className="text-xs text-muted-foreground mb-3">Você define o valor exato em reais. Útil para custos fixos dedicados (ex: aluguel de galpão específico).</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
              <Percent size={14} /> Estratégico (%)
            </h4>
            <p className="text-xs text-muted-foreground mb-3">Você define quanto da receita daquele departamento será "comida" pelo custo fixo.</p>
            <div className="bg-background p-3 rounded border border-border text-xs text-foreground">
              <BlockMath math={`Custo = Fat_{Dept} \\times Meta\\%`} />
            </div>
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

  // Cálculos Específicos por Modo
  const allocatedSum = useMemo(() => {
    if (allocationMode === 'manual') {
      return departments.reduce((sum, d) => sum + (d.manualCost || 0), 0);
    }
    if (allocationMode === 'strategic') {
      return departments.reduce((sum, d) => sum + (d.totalRevenue * ((d.strategicTargetPercent || 0) / 100)), 0);
    }
    return companyTotalFixedCost;
  }, [departments, allocationMode, companyTotalFixedCost]);

  const balanceToAllocate = companyTotalFixedCost - allocatedSum;

  // --- Actions ---
  const handleUpdateDepartment = (id: number, field: keyof Department, value: any) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleAddDepartment = () => {
    const newId = departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1;
    setDepartments([...departments, { id: newId, name: '', totalRevenue: 0, strategicTargetPercent: 0 }]);
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="text-primary" />
            Simulador de Custos Fixos
          </h1>
          <p className="text-muted-foreground mt-1">Gerenciamento estratégico de rateio por departamento</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted hover:text-foreground transition-all shadow-sm"
          >
            <RotateCcw size={16} /> Restaurar Padrões
          </button>
        </div>
      </div>

      <KPIGrid
        totalCost={companyTotalFixedCost}
        onTotalCostChange={(val) => setCompanyTotalFixedCost(parseFloat(val || '0'))}
        costTarget={costTarget}
        onTargetChange={setCostTarget}
        currentCostPercent={currentCostPercent}
      />

      <Card>
        <CardHeader
          title="Detalhamento por Departamento"
          icon={BarChart3}
          action={
            <div className="flex bg-muted p-1 rounded-lg gap-1">
              <button
                onClick={() => setAllocationMode('auto')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${allocationMode === 'auto' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                <Settings2 size={14} /> Automático
              </button>
              <button
                onClick={() => setAllocationMode('manual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${allocationMode === 'manual' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                <Calculator size={14} /> Manual (R$)
              </button>
              <button
                onClick={() => setAllocationMode('strategic')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${allocationMode === 'strategic' ? 'bg-background text-purple-600 shadow-sm ring-1 ring-purple-100' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
              >
                <Percent size={14} /> Estratégico (%)
              </button>
            </div>
          }
        />

        {/* --- BARRA DE STATUS PARA MODO MANUAL E ESTRATÉGICO --- */}
        {(allocationMode === 'manual' || allocationMode === 'strategic') && (
          <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between text-sm gap-4 transition-colors duration-300 ${Math.abs(balanceToAllocate) < 1
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : balanceToAllocate > 0
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-rose-500/10 border-rose-500/20'
            }`}>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${Math.abs(balanceToAllocate) < 1 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-background text-muted-foreground'}`}>
                {Math.abs(balanceToAllocate) < 1 ? <CheckCircle2 size={18} /> : <ArrowRightLeft size={18} />}
              </div>
              <div>
                <p className={`font-bold ${Math.abs(balanceToAllocate) < 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                  {allocationMode === 'strategic' ? 'Alocação Estratégica por Margem' : 'Alocação Manual Direta'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.abs(balanceToAllocate) < 1
                    ? 'Você atingiu o custo fixo exato!'
                    : balanceToAllocate > 0
                      ? 'Você ainda precisa alocar mais custos para cobrir o total.'
                      : 'Você alocou mais do que o custo fixo total.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-background/50 p-2 rounded-lg border border-border/50">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Meta Total</p>
                <p className="font-semibold">{formatCurrency(companyTotalFixedCost)}</p>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Alocado</p>
                <p className="font-semibold">{formatCurrency(allocatedSum)}</p>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div className="text-right min-w-[100px]">
                <p className="text-xs text-muted-foreground">Diferença</p>
                <span className={`font-bold block px-2 py-0.5 rounded text-center ${Math.abs(balanceToAllocate) < 1
                  ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                  : 'bg-foreground text-background'
                  }`}>
                  {formatCurrency(balanceToAllocate)}
                </span>
              </div>
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

        <div className="p-4 border-t border-border bg-muted/20 rounded-b-xl flex justify-center">
          <button
            onClick={handleAddDepartment}
            className="group flex items-center gap-2 px-4 py-2 bg-background border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium"
          >
            <div className="bg-muted group-hover:bg-primary/20 rounded-full p-1 transition-colors">
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