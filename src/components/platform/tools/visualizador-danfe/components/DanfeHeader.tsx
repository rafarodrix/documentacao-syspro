// components/danfe-visualizer/DanfeHeader.tsx
import { FC } from 'react';
import { Building, UserCircle } from 'lucide-react';
import { DanfeData } from '../types';

export const DanfeHeader: FC<{ emit: DanfeData['emit']; dest: DanfeData['dest'] }> = ({ emit, dest }) => (
    <header className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="border p-4 rounded-lg bg-secondary/30">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2"><Building size={18}/> Emitente</h3>
            <p className="font-semibold text-foreground">{emit?.xNome}</p>
            <p className="text-muted-foreground">CNPJ: {emit?.CNPJ}</p>
            <p className="text-muted-foreground">IE: {emit?.IE}</p>
            <p className="text-muted-foreground mt-2">{emit?.enderEmit}</p>
        </div>
        <div className="border p-4 rounded-lg bg-secondary/30">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2"><UserCircle size={18}/> Destinatário</h3>
            <p className="font-semibold text-foreground">{dest?.xNome}</p>
            <p className="text-muted-foreground">CNPJ/CPF: {dest?.CNPJ || dest?.CPF}</p>
            <p className="text-muted-foreground">IE: {dest?.IE || 'Isento'}</p>
            <p className="text-muted-foreground mt-2">{dest?.enderDest}</p>
        </div>
    </header>
);