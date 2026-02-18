// components/danfe-visualizer/DanfeTotals.tsx
import { FC } from 'react';
import { DanfeData } from '../types';
import { formatCurrency } from '../utils';

export const DanfeTotals: FC<{ total: DanfeData['total'] }> = ({ total }) => (
    <section className="border-t pt-6">
        <h3 className="text-xl font-bold mb-4">Totais da Nota</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            <div className="border p-4 rounded-lg bg-secondary/30 space-y-2">
                <p className="font-semibold text-base mb-2">Composição do Valor Total</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Produtos:</span> <strong>{formatCurrency(total?.vProd)}</strong></div>
                {(total?.vFrete ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) Frete:</span> {formatCurrency(total?.vFrete)}</div>}
                {(total?.vST ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) ICMS ST:</span> {formatCurrency(total?.vST)}</div>}
                {(total?.vIPI ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) IPI:</span> {formatCurrency(total?.vIPI)}</div>}
                {(total?.vDesc ?? 0) > 0 && <div className="flex justify-between text-destructive"><span>(-) Descontos:</span> - {formatCurrency(total?.vDesc)}</div>}
                <div className="flex justify-between font-bold text-lg mt-2 border-t pt-2"><span className="text-foreground">TOTAL DA NOTA:</span> <span className="text-foreground">{formatCurrency(total?.vNF)}</span></div>
            </div>
            <div className="border p-4 rounded-lg bg-secondary/30 space-y-2">
                <p className="font-semibold text-base mb-2">Resumo de Tributos</p>
                <div className="flex justify-between"><span className="text-muted-foreground">BC ICMS:</span> {formatCurrency(total?.vBC)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor ICMS:</span> {formatCurrency(total?.vICMS)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">PIS+COFINS:</span> {formatCurrency((total?.vPIS ?? 0) + (total?.vCOFINS ?? 0))}</div>
                {(total?.vTotTrib ?? 0) > 0 && <p className="font-medium text-foreground mt-2 pt-2 border-t">Aprox. Tributos: {formatCurrency(total?.vTotTrib)}</p>}
            </div>
        </div>
    </section>
);