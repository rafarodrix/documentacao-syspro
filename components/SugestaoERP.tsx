'use client';
import { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';

// Tipos para as propriedades que este componente recebe
interface SugestaoERPProps {
  item: {
    CST_ICMS: string | null;
    pICMS: number | null;
    CST_PIS: string | null;
    CST_COFINS: string | null;
  };
}

export function SugestaoERP({ item }: SugestaoERPProps) {
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setIsLoading(true);
    setError(null);
    setSugestao(null);

    // Validação para garantir que os dados mínimos existem
    if (!item.CST_ICMS || !item.CST_PIS || !item.CST_COFINS) {
        setError('CSTs de ICMS, PIS e COFINS são obrigatórios para a sugestão.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/sugerir-tributacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cstIcms: item.CST_ICMS,
          pIcms: item.pICMS,
          cstPis: item.CST_PIS,
          cstCofins: item.CST_COFINS,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao buscar sugestão.');
      }

      const data = await response.json();
      setSugestao(data.sugestao);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <button
        onClick={handleSuggest}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
      >
        <Sparkles size={16} />
        {isLoading ? 'Analisando...' : 'Sugerir Tributação ERP'}
      </button>

      {isLoading && <Loader className="animate-spin mt-2 text-primary" size={20} />}
      
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      
      {sugestao && (
        <div className="mt-2">
            <p className="text-xs text-muted-foreground">Sugestão de tributação para o ERP:</p>
            <p className="font-mono text-base bg-secondary p-2 rounded mt-1">{sugestao}</p>
        </div>
      )}
    </div>
  );
}