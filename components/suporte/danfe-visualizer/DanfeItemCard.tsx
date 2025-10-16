// components/danfe-visualizer/DanfeItemCard.tsx

import { FC, ReactNode } from 'react';
import { ChevronDown, Percent, Calculator, Landmark, BadgeInfo } from 'lucide-react';
import { ItemData } from './types';
import { formatCurrency, formatNumber, formatPercent } from './utils';
import { SugestaoERP } from './SugestaoERP';

// Componente auxiliar para seções de impostos
interface TaxDetailSectionProps {
  title: string;
  icon: ReactNode;
  colorClass: string;
  condition?: boolean;
  children: ReactNode;
}

const TaxDetailSection: FC<TaxDetailSectionProps> = ({ title, icon, colorClass, condition = true, children }) => {
  if (!condition) return null;
  return (
    <div className={`border-l-4 ${colorClass} pl-3`}>
      <h4 className="font-semibold flex items-center gap-1 mb-1 text-foreground/90">{icon}{title}</h4>
      {children}
    </div>
  );
};

export const DanfeItemCard: FC<{ item: ItemData; ufDest: string }> = ({ item, ufDest }) => {
  const { ICMS, IPI, PIS, COFINS, vTotTrib } = item.impostos;

  return (
    <div className="border rounded-xl p-4 bg-secondary/20 transition-all hover:shadow-md hover:bg-secondary/30">
      <p className="font-bold text-base text-foreground">({item.cProd}) {item.xProd}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
        <span><strong>NCM:</strong> {item.NCM}</span>
        <span><strong>CFOP:</strong> {item.CFOP}</span>
        <span><strong>Qtd:</strong> {formatNumber(item.qCom)} {item.uCom}</span>
        <span><strong>Unit:</strong> {formatCurrency(item.vUnCom)}</span>
        <span className="font-bold text-foreground"><strong>Total:</strong> {formatCurrency(item.vProd)}</span>
      </div>

      <details className="mt-3 group" open> {/* O 'open' faz com que já venha aberto por padrão */}
        <summary className="cursor-pointer text-xs font-semibold text-primary flex items-center gap-1 list-none">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          Ver Detalhamento Tributário
        </summary>

        <div className="mt-3 space-y-4 border-t border-border/60 pt-3 text-xs">
          
          <TaxDetailSection title={`ICMS (CST ${ICMS.CST})`} icon={<Percent size={14} />} colorClass="border-blue-500" condition={!!ICMS.CST}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
              <span>BC: {formatCurrency(ICMS.vBC)}</span>
              {/* Este campo só aparece se de fato houver redução */}
              {(ICMS.pRedBC ?? 0) > 0 && <span>Red. BC: {formatPercent(ICMS.pRedBC)}</span>}
              <span>Alíquota: {formatPercent(ICMS.pICMS)}</span>
              <span className="font-semibold">Valor: {formatCurrency(ICMS.vICMS)}</span>
            </div>
            {/* Este campo só aparece se de fato houver desoneração */}
            {(ICMS.vICMSDeson ?? 0) > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-border/40">
                <div className="flex items-center gap-2 text-blue-700"><BadgeInfo size={14} />
                  <p><strong>ICMS Desonerado:</strong> {formatCurrency(ICMS.vICMSDeson)}<span className="ml-2 text-muted-foreground">(Motivo: {ICMS.motDesICMS})</span></p>
                </div>
              </div>
            )}
          </TaxDetailSection>

          <TaxDetailSection title="ICMS ST" icon={<Calculator size={14} />} colorClass="border-indigo-500" condition={(ICMS?.vICMSST ?? 0) > 0}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
              <span>BC ST: {formatCurrency(ICMS.vBCST)}</span>
              <span>% MVA: {formatPercent(ICMS.pMVAST)}</span>
              <span>Alíquota ST: {formatPercent(ICMS.pICMSST)}</span>
              <span className="font-bold">Valor ST: {formatCurrency(ICMS.vICMSST)}</span>
            </div>
          </TaxDetailSection>

          {/* MUDANÇA: A condição agora é sempre 'true' para exibir os dados mesmo zerados */}
          <TaxDetailSection title={`IPI (CST ${IPI.CST})`} icon={<Percent size={14} />} colorClass="border-orange-500" condition={!!IPI.CST}>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                <span>BC: {formatCurrency(item.vProd)}</span>
                <span>Alíquota: {formatPercent(IPI.pIPI)}</span>
                <span className="font-bold">Valor: {formatCurrency(IPI.vIPI)}</span>
              </div>
          </TaxDetailSection>

          {/* MUDANÇA: A condição agora é sempre 'true' para exibir os dados mesmo zerados */}
          <TaxDetailSection title="PIS / COFINS" icon={<Percent size={14} />} colorClass="border-green-500" condition={!!PIS.CST}>
            <div className="space-y-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                <span><strong>PIS (CST {PIS?.CST}):</strong> {formatCurrency(PIS?.vPIS)}</span>
                <span>BC: {formatCurrency(PIS?.vBC)}</span>
                <span>Alíquota: {formatPercent(PIS?.pPIS)}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                <span><strong>COFINS (CST {COFINS?.CST}):</strong> {formatCurrency(COFINS?.vCOFINS)}</span>
                <span>BC: {formatCurrency(COFINS?.vBC)}</span>
                <span>Alíquota: {formatPercent(COFINS?.pCOFINS)}</span>
              </div>
            </div>
          </TaxDetailSection>

          <TaxDetailSection title="Tributos Aproximados (IBPT)" icon={<Landmark size={14} />} colorClass="border-slate-500" condition={(vTotTrib ?? 0) > 0}>
            <p>Valor Total: <strong>{formatCurrency(vTotTrib)}</strong></p>
          </TaxDetailSection>
          
        </div>
      </details>

      <SugestaoERP item={item} ufDest={ufDest} />
    </div>
  );
};