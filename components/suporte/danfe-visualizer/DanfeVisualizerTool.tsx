// components/danfe-visualizer/DanfeVisualizerTool.tsx
'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { UploadCloud, Loader, AlertTriangle, Package } from 'lucide-react';
import { DanfeData } from './types';

// Importando todos os nossos componentes separados!
import { DanfeHeader } from './DanfeHeader';
import { DanfeGeneralInfo } from './DanfeGeneralInfo';
import { DanfeItemCard } from './DanfeItemCard';
import { DanfeTotals } from './DanfeTotals';


export function DanfeVisualizerTool() {
  const [danfeData, setDanfeData] = useState<DanfeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setDanfeData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/visualizar-danfe', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        try {
          const errJson = JSON.parse(text);
          throw new Error(errJson.error || `Erro ${res.status}`);
        } catch {
          throw new Error(`Erro ${res.status}: ${res.statusText}.`);
        }
      }
      const data: DanfeData = await res.json();
      setDanfeData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro no processamento XML:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Upload Box */}
      <div className="flex justify-center max-w-full mb-8">
        <label htmlFor="xml-upload" className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border text-center cursor-pointer hover:border-primary/70 hover:bg-secondary/30 transition-colors w-full max-w-md">
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="font-semibold text-primary">Selecionar Arquivo XML</span>
          <span className="text-xs text-muted-foreground mt-1">Clique ou arraste o arquivo aqui</span>
          <input id="xml-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
        </label>
      </div>

      {/* States: Loading e Error */}
      {isLoading && <div className="flex items-center justify-center gap-2 text-muted-foreground animate-fade-in"><Loader className="animate-spin" size={20} /> Processando XML...</div>}
      {error && <div className="flex items-center gap-3 bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/30 animate-fade-in"><AlertTriangle size={20} /> {error}</div>}

      {/* Resultado Final */}
      {danfeData && (
        <div className="border rounded-xl p-6 md:p-8 bg-card animate-fade-in space-y-8 max-w-6xl mx-auto shadow-sm">
          <DanfeHeader emit={danfeData.emit} dest={danfeData.dest} />
          <DanfeGeneralInfo ide={danfeData.ide} chave={danfeData.meta.chave} />
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Package size={22} /> Itens da Nota</h3>
            <div className="space-y-4">
              {danfeData.det.map((item, index) => (
                <DanfeItemCard 
                  key={item.nItem || index} 
                  item={item}
                  ufDest={danfeData.dest.raw.UF}
                />
              ))}
            </div>
          </section>
          <DanfeTotals total={danfeData.total} />
        </div>
      )}
    </div>
  );
}