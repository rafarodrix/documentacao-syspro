'use client';

// 1?? IMPORTS OTIMIZADOS
import { useState, useCallback, useMemo, ChangeEvent, FC } from 'react';
import {
  UploadCloud, Loader, AlertTriangle, Package, Building, UserCircle, Hash,
  ChevronDown, Percent, Calculator, Landmark, BadgeInfo, Sparkles, RefreshCw,
  Clock, Truck, Coins, FileText
} from 'lucide-react';

// 2?? IMPORTAÇÃO DO ARQUIVO DE TYPES CENTRALIZADO
import { DanfeData, ItemData, SugestaoTributaria } from '../types'; // Ajuste o caminho conforme necessário

// =============================================================
// 3?? FUNÇÕES AUXILIARES (formatadores centralizados)
// =============================================================
const formatCurrency = (v?: number | null) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
const formatNumber = (v?: number | null, fractionDigits: number = 2) =>
  v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }) : '0,00';
const formatPercent = (v?: number | null) => (v != null ? `${v.toFixed(2)}%` : '-');
const formatDate = (iso?: string) => {
  if (!iso) return '-';
  // Tenta parsear formatos ISO ou o formato NFe
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

// =============================================================
// 4?? COMPONENTE DE SUGESTÃO DE TRIBUTAÇÃO 
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
          ncm: item.NCM, 
          cfop: item.CFOP, 
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
// 5?? UI — COMPONENTES DE APOIO E VISUALIZAÇÃO
// =============================================================

/** Card de Detalhes Tributários de um Item */
const DanfeItemCard: FC<{ item: ItemData; ufDest: string }> = ({ item, ufDest }) => {
  const { ICMS, IPI, PIS, COFINS, vTotTrib } = item.impostos;

  return (
    <div className="border rounded-xl p-4 bg-secondary/20 transition-all hover:shadow-md">
      <p className="font-bold text-base text-foreground">
        ({item.cProd}) {item.xProd}
      </p>

      {/* Detalhes principais do produto */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
        <span><Hash size={12} className="inline mr-1" /> **NCM:** {item.NCM}</span>
        <span><FileText size={12} className="inline mr-1" /> **CFOP:** {item.CFOP}</span>
        <span><Package size={12} className="inline mr-1" /> **Qtd:** {formatNumber(item.qCom, 4)} {item.uCom}</span>
        <span><Coins size={12} className="inline mr-1" /> **Unit:** {formatCurrency(item.vUnCom)}</span>
        <span className="font-bold text-foreground"><Calculator size={12} className="inline mr-1" /> **Total:** {formatCurrency(item.vProd)}</span>
      </div>

      {/* Detalhamento tributário (ICMS, IPI, PIS, COFINS) */}
      <details className="mt-3 group text-sm border-t border-border/50 pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-primary flex items-center gap-1 list-none">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /> Ver Detalhamento Tributário ({formatCurrency(vTotTrib)} Total Estimado)
        </summary>
        
        <div className="mt-3 space-y-3 p-3 bg-white/50 dark:bg-black/50 rounded-lg shadow-inner">
          {/* ICMS */}
          <div className="border-l-4 border-amber-500 pl-3">
            <p className="font-bold text-sm flex items-center gap-1"><Percent size={14} /> ICMS</p>
            <p className="text-xs text-muted-foreground">CST: {ICMS.CST} | Orig: {ICMS.orig} | Base: {formatCurrency(ICMS.vBC)} | Alíq: {formatPercent(ICMS.pICMS)} | **Valor:** {formatCurrency(ICMS.vICMS)}</p>
            {ICMS.vICMSST && <p className="text-xs text-muted-foreground font-mono">ST: Base {formatCurrency(ICMS.vBCST)} / Valor {formatCurrency(ICMS.vICMSST)}</p>}
          </div>

          {/* IPI */}
          <div className="border-l-4 border-blue-500 pl-3">
            <p className="font-bold text-sm flex items-center gap-1"><Package size={14} /> IPI</p>
            <p className="text-xs text-muted-foreground">CST: {IPI.CST} | Alíq: {formatPercent(IPI.pIPI)} | **Valor:** {formatCurrency(IPI.vIPI)}</p>
          </div>

          {/* PIS/COFINS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border-l-4 border-green-500 pl-3">
              <p className="font-bold text-sm flex items-center gap-1"><Landmark size={14} /> PIS</p>
              <p className="text-xs text-muted-foreground">CST: {PIS.CST} | Base: {formatCurrency(PIS.vBC)} | Alíq: {formatPercent(PIS.pPIS)} | **Valor:** {formatCurrency(PIS.vPIS)}</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-3">
              <p className="font-bold text-sm flex items-center gap-1"><Landmark size={14} /> COFINS</p>
              <p className="text-xs text-muted-foreground">CST: {COFINS.CST} | Base: {formatCurrency(COFINS.vBC)} | Alíq: {formatPercent(COFINS.pCOFINS)} | **Valor:** {formatCurrency(COFINS.vCOFINS)}</p>
            </div>
          </div>
        </div>
      </details>

      <SugestaoERP item={item} ufDest={ufDest} />
    </div>
  );
};

/** Card de Informações da Nota (Emitente, Destinatário, Meta) */
const DanfeHeaderCard: FC<{ danfe: DanfeData }> = ({ danfe }) => (
  <div className="grid md:grid-cols-3 gap-6">
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border">
      <h3 className="font-bold text-base text-primary flex items-center gap-2 mb-2"><FileText size={16} /> Nota Fiscal</h3>
      <p className="text-sm">**Chave:** <span className="font-mono text-xs break-all">{danfe.meta.chave}</span></p>
      <p className="text-sm">**Número/Série:** {danfe.ide.nNF}/{danfe.ide.serie}</p>
      <p className="text-sm">**Emissão:** {formatDate(danfe.ide.dhEmi)}</p>
      <p className="text-sm">**Natureza Op.:** {danfe.ide.natOp}</p>
    </div>
    
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border">
      <h3 className="font-bold text-base text-blue-600 flex items-center gap-2 mb-2"><Building size={16} /> Emitente</h3>
      <p className="text-sm">**Nome:** {danfe.emit.xNome}</p>
      <p className="text-sm">**CNPJ:** {danfe.emit.CNPJ}</p>
      <p className="text-sm">**IE:** {danfe.emit.IE}</p>
      <p className="text-sm truncate">**Endereço:** {danfe.emit.enderEmit}</p>
    </div>
    
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border">
      <h3 className="font-bold text-base text-green-600 flex items-center gap-2 mb-2"><UserCircle size={16} /> Destinatário</h3>
      <p className="text-sm">**Nome:** {danfe.dest.xNome}</p>
      <p className="text-sm">**CNPJ/CPF:** {danfe.dest.CNPJ || danfe.dest.CPF}</p>
      <p className="text-sm">**IE:** {danfe.dest.IE}</p>
      <p className="text-sm truncate">**Endereço:** {danfe.dest.enderDest} - **UF:** {danfe.dest.raw.UF}</p>
    </div>
  </div>
);

/** Card de Totais da Nota */
const DanfeTotalsCard: FC<{ danfe: DanfeData }> = ({ danfe }) => (
  <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 shadow-lg">
    <h3 className="font-bold text-lg text-primary flex items-center gap-2 mb-3"><Calculator size={20} /> Totais da Nota</h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm font-medium">
      <div className="p-2 border rounded bg-white dark:bg-gray-900">
        <p className="text-xs text-muted-foreground">Valor Produtos</p>
        <p className="text-base font-semibold text-foreground">{formatCurrency(danfe.total.vProd)}</p>
      </div>
      <div className="p-2 border rounded bg-white dark:bg-gray-900">
        <p className="text-xs text-muted-foreground">Valor ICMS</p>
        <p className="text-base text-amber-600">{formatCurrency(danfe.total.vICMS)}</p>
      </div>
      <div className="p-2 border rounded bg-white dark:bg-gray-900">
        <p className="text-xs text-muted-foreground">Valor IPI</p>
        <p className="text-base text-blue-600">{formatCurrency(danfe.total.vIPI)}</p>
      </div>
      <div className="p-2 border rounded bg-white dark:bg-gray-900">
        <p className="text-xs text-muted-foreground">Valor Frete</p>
        <p className="text-base text-foreground">{formatCurrency(danfe.total.vFrete)}</p>
      </div>
      <div className="p-2 border rounded bg-primary/20">
        <p className="text-xs font-bold text-primary">Valor Total NF</p>
        <p className="text-lg font-extrabold text-primary">{formatCurrency(danfe.total.vNF)}</p>
      </div>
    </div>
  </div>
);


// =============================================================
// 6?? COMPONENTE PRINCIPAL
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

      // NOTE: Endpoint que receberá o XML e retornará o JSON da DANFE
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

  const ufDest = danfeData?.dest.raw.UF || 'SP'; // Default ou buscar de um campo de seleção

  return (
    <div className="space-y-8">
      {/* Upload - (Mantido) */}
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

      {/* Feedbacks - (Mantido) */}
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

      {/* Resultado (Novo) */}
      {danfeData && (
        <div className="border rounded-xl p-6 md:p-8 bg-card animate-fade-in space-y-8 max-w-6xl mx-auto shadow-sm">
          <DanfeHeaderCard danfe={danfeData} />
          
          <hr className="border-border" />
          
          <DanfeTotalsCard danfe={danfeData} />
          
          <hr className="border-border" />

          {/* Lista de Itens */}
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package size={20} /> Itens da Nota</h2>
          <div className="space-y-6">
            {danfeData.det.map((item) => (
              <DanfeItemCard key={item.nItem} item={item} ufDest={ufDest} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DanfeVisualizerTool; 