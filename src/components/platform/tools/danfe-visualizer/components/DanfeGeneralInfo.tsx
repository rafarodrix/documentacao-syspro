// components/danfe-visualizer/DanfeGeneralInfo.tsx
import { FC } from 'react';
import { Hash } from 'lucide-react';
import { DanfeData } from '../types';
import { formatDate } from '../utils';

export const DanfeGeneralInfo: FC<{ ide: DanfeData['ide'], chave: string }> = ({ ide, chave }) => (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm border-t border-b py-6">
        <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Documento</p>
            <p className="text-base font-medium">NF-e: {ide?.nNF} (Série {ide?.serie})</p>
        </div>
        <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Emissão</p>
            <p>{formatDate(ide?.dhEmi)}</p>
        </div>
        <div className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Natureza da Operação</p>
            <p className="capitalize">{ide?.natOp?.toLowerCase() || '—'}</p>
        </div>
        <div className="font-mono text-xs col-span-full bg-secondary p-2 rounded-md break-all">
            <strong className="flex items-center gap-2"><Hash size={14}/> Chave de Acesso:</strong>
            <span>{chave}</span>
        </div>
    </section>
);