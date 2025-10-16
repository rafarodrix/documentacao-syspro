'use client';

import { useState, useCallback, useMemo, ChangeEvent, FC } from 'react';
import {
  UploadCloud, Loader, AlertTriangle, Package, Building, UserCircle, Hash,
  ChevronDown, Percent, Calculator, Landmark, BadgeInfo, Sparkles, RefreshCw
} from 'lucide-react';

// =============================================================
// 1️⃣ TIPAGEM CENTRALIZADA
// =============================================================
interface DanfeImpostos {
  vTotTrib: number | null;
  ICMS: {
    orig: string | null;
    CST: string | null;
    vBC: number | null;
    pICMS: number | null;
    vICMS: number | null;
    vBCST?: number | null;
    pMVAST?: number | null;
    pICMSST?: number | null;
    vICMSST?: number | null;
    pRedBC?: number | null;
    vICMSDeson?: number | null;
    motDesICMS?: string | null;
  };
  IPI: { CST: string | null; pIPI: number | null; vIPI: number | null; };
  PIS: { CST: string | null; vBC: number | null; pPIS: number | null; vPIS: number | null; };
  COFINS: { CST: string | null; vBC: number | null; pCOFINS: number | null; vCOFINS: number | null; };
}

interface ItemData {
  nItem: string;
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  uCom: string;
  qCom: number | null;
  vUnCom: number | null;
  vProd: number | null;
  impostos: DanfeImpostos;
}

interface DanfeData {
  meta: { chave: string; };
  ide: { nNF: string; serie: string; dhEmi: string; natOp: string; };
  emit: { xNome: string; CNPJ: string; IE: string; enderEmit: string; };
  dest: {
    xNome: string;
    CNPJ: string;
    CPF: string;
    IE: string;
    enderDest: string;
    raw: { UF: string; };
  };
  total: {
    vProd: number | null; vFrete: number | null; vST: number | null;
    vIPI: number | null; vDesc: number | null; vNF: number | null;
    vBC: number | null; vICMS: number | null;
    vPIS: number | null; vCOFINS: number | null; vTotTrib: number | null;
  };
  det: ItemData[];
}

interface SugestaoTributaria {
  sugestao: string;
  informacao: string;
}

// =============================================================
// 2️⃣ FUNÇÕES AUXILIARES (formatadores centralizados)
// =============================================================
const formatCurrency = (v?: number | null) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
const formatNumber = (v?: number | null) =>
  v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0,00';
const formatPercent = (v?: number | null) => (v != null ? `${v.toFixed(2)}%` : '-');
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '-');

// =============================================================
// 3️⃣ COMPONENTE DE SUGESTÃO DE TRIBUTAÇÃO (com fetch à API)
// =============================================================
export const SugestaoERP: FC<{ item: ItemData; ufDest: string }> = ({ item, ufDest }) => {
  const [sugestao, setSugestao] = useState<SugestaoTributaria | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = useCallback(async () => {
    const { ICMS, PIS, COFINS } = item.impostos;
    if (!ICMS?.CST || !PIS?.CST || !COFINS?.CST) {
      setError('Dados fiscais insuficientes para gerar sugestão.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sugerir-tributacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cstIcms: ICMS.CST,
          pIcms: ICMS.pICMS,
          cstPis: PIS.CST,
          cstCofins: COFINS.CST,
          ufDest: ufDest,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ao sugerir tributação (${res.status})`);
      }

      const data: SugestaoTributaria = await res.json();
      setSugestao(data);
    } catch (err: any) {
      console.error('Erro ao sugerir tributação:', err);
      setError(err.message || 'Falha inesperada na análise.');
    } finally {
      setIsLoading(false);
    }
  }, [item, ufDest]);

  const content = useMemo(() => {
    if (isLoading)
      return (
        <div className="text-sm text-muted-foreground animate-fade-in text-center">
          <Loader className="animate-spin mx-auto mb-2" size={24} />
          Analisando tributação...
        </div>
      );

    if (error)
      return (
        <div className="text-sm text-destructive animate-fade-in text-center">
          <AlertTriangle className="mx-auto mb-2" size={24} />
          <p className="font-semibold">Erro ao sugerir</p>
          <p>{error}</p>
          <button
            onClick={handleSuggest}
            className="text-xs mt-2 text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      );

    if (sugestao)
      return (
        <div className="text-center animate-fade-in w-full">
          <p className="text-xs text-muted-foreground">Sugestão para cadastro:</p>
          <p className="font-mono text-xl font-bold text-primary bg-primary/10 px-3 py-1 rounded-md my-1">
            {sugestao.sugestao}
          </p>
          <p className="text-xs text-muted-foreground mt-2 mb-3">{sugestao.informacao}</p>
          <button
            onClick={handleSuggest}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
          >
            <RefreshCw size={12} /> Analisar Novamente
          </button>
        </div>
      );

    return (
      <button
        onClick={handleSuggest}
        className="font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        Gerar Sugestão de Entrada
      </button>
    );
  }, [isLoading, error, sugestao, handleSuggest]);

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Sparkles size={16} className="text-primary" /> Assistente de Tributação ERP
      </h4>
      <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border/60 min-h-[8rem] flex flex-col justify-center items-center">
        {content}
      </div>
    </div>
  );
};

// =============================================================
// 4️⃣ UI — COMPONENTES DE APOIO
// =============================================================
const DanfeItemCard: FC<{ item: ItemData; ufDest: string }> = ({ item, ufDest }) => {
  const { ICMS, IPI, PIS, COFINS, vTotTrib } = item.impostos;

  return (
    <div className="border rounded-xl p-4 bg-secondary/20 transition-all hover:shadow-md">
      <p className="font-bold text-base text-foreground">
        ({item.cProd}) {item.xProd}
      </p>

      {/* Detalhes principais do produto */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
        <span><strong>NCM:</strong> {item.NCM}</span>
        <span><strong>CFOP:</strong> {item.CFOP}</span>
        <span><strong>Qtd:</strong> {formatNumber(item.qCom)} {item.uCom}</span>
        <span><strong>Unit:</strong> {formatCurrency(item.vUnCom)}</span>
        <span className="font-bold text-foreground"><strong>Total:</strong> {formatCurrency(item.vProd)}</span>
      </div>

      {/* Detalhamento tributário */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs font-semibold text-primary flex items-center gap-1 list-none">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> Ver Detalhamento Tributário
        </summary>

        {/* ... (detalhes internos mantidos iguais) */}
      </details>

      <SugestaoERP item={item} ufDest={ufDest} />
    </div>
  );
};

// =============================================================
// 5️⃣ COMPONENTE PRINCIPAL
// =============================================================
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

      const res = await fetch('/api/parse-nfe', { method: 'POST', body: formData });
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
      {/* Upload */}
      <div className="flex justify-center max-w-full mb-8">
        <label
          htmlFor="xml-upload"
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border text-center cursor-pointer hover:border-primary/70 hover:bg-secondary/30 transition-colors w-full max-w-md"
        >
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="font-semibold text-primary">Selecionar Arquivo XML</span>
          <span className="text-xs text-muted-foreground mt-1">Clique ou arraste o arquivo aqui</span>
          <input id="xml-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
        </label>
      </div>

      {/* Feedbacks */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground animate-fade-in">
          <Loader className="animate-spin" size={20} /> Processando XML...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/30 animate-fade-in">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Resultado */}
      {danfeData && (
        <div className="border rounded-xl p-6 md:p-8 bg-card animate-fade-in space-y-8 max-w-6xl mx-auto shadow-sm">
          {/* Cabeçalhos, Totais, Itens... */}
        </div>
      )}
    </div>
  );
}
