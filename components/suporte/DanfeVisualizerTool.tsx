'use client';

import { useState, ChangeEvent } from 'react';
import { UploadCloud, Loader, AlertTriangle, Package, Truck, Landmark, Info, ChevronDown, Percent, Calculator } from 'lucide-react';
import { SugestaoERP } from '../SugestaoERP';

// --- Interfaces de Tipos (Atualizadas para maior robustez) ---
interface ItemFiscalData {
  cProd: string | null; xProd: string | null; NCM: string | null; CFOP: string | null;
  qCom: number | null; vUnCom: number | null; vProd: number | null;
  CST_ICMS: string | null; vBC: number | null; pICMS: number | null; vICMS: number | null; pRedBC: number | null;
  vBCST: number | null; pMVAST: number | null; pICMSST: number | null; vICMSST: number | null; pRedBCST: number | null;
  CST_IPI: string | null; vIPI: number | null; pIPI: number | null;
  CST_PIS: string | null; pPIS: number | null; vPIS: number | null;
  CST_COFINS: string | null; pCOFINS: number | null; vCOFINS: number | null;
  vFrete: number | null; vSeg: number | null; vOutro: number | null;
}
interface DanfeData {
  ide: { nNF: string; serie: string; dhEmi: string; natOp: string; CFOP: string; mod: string; tpNF: string; cNF: string; };
  emit: { xNome: string; CNPJ: string; IE: string; enderEmit: string; UF: string; };
  dest: { xNome: string; doc: string; IE: string; enderDest: string; UF: string; };
  transp: { modFrete: string; transporta: any; veicTransp: any; vol: any[]; };
  det: ItemFiscalData[];
  total: any;
  cobr: any[];
  infAdic: { infCpl: string; infAdFisco: string; };
  chave: string;
}

// --- Funções Auxiliares de Formatação ---
const formatCurrency = (value: any) => (value != null ? Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00');
const formatNumber = (value: any) => (value != null ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0,00');
const formatPercent = (value: any) => (value != null ? `${Number(value).toFixed(2)}%` : '-');
const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
        return new Date(isoStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return isoStr;
    }
};

// --- Componente Principal ---
export function DanfeVisualizerTool() {
  const [danfeData, setDanfeData] = useState<DanfeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setDanfeData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/visualizar-danfe', { method: 'POST', body: formData });
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Erro desconhecido no servidor.');
      }
      const data = await response.json();
      setDanfeData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload */}
      <div className="flex justify-center max-w-full mb-8">
        <label htmlFor="xml-upload"
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border
          text-center cursor-pointer hover:border-primary/70 hover:bg-secondary/30 transition-colors w-full max-w-md">
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="font-semibold text-primary">Selecionar Arquivo XML</span>
          <span className="text-xs text-muted-foreground mt-1">Clique ou arraste o arquivo aqui</span>
          <input id="xml-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
        </label>
      </div>

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

      {danfeData && (
        <div className="border rounded-xl p-6 md:p-8 bg-card animate-fade-in space-y-8 max-w-6xl mx-auto shadow-sm">

          {/* Cabeçalho */}
          <header className="text-center">
            <h2 className="text-2xl font-bold">{danfeData.emit?.xNome}</h2>
            <p className="text-sm text-muted-foreground">
              CNPJ: {danfeData.emit?.CNPJ} — UF: {danfeData.emit?.UF}
            </p>
          </header>

          {/* Informações Gerais */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm border-t border-b py-6">
              <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Documento</p>
                  <p className="text-base font-medium">NF-e: {danfeData.ide?.nNF} (Série {danfeData.ide?.serie})</p>
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Emissão</p>
                  <p>{formatDate(danfeData.ide?.dhEmi)}</p>
              </div>
              <div className="lg:col-span-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Natureza da Operação</p>
                  <p className="capitalize">{danfeData.ide?.natOp?.toLowerCase() || '—'}</p>
              </div>
              <div className="font-mono text-xs col-span-full bg-secondary p-2 rounded-md break-all">
                  <strong>Chave:</strong> {danfeData.chave}
              </div>
          </section>

          {/* Itens */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Package size={22} /> Itens da Nota</h3>
            <div className="space-y-4">
              {danfeData.det.map((item, i) => (
                <div key={i} className="border rounded-xl p-4 bg-secondary/20 transition-all">
                  <p className="font-bold text-base text-foreground">({item.cProd}) {item.xProd}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground text-sm">
                    <span><strong>NCM:</strong> {item.NCM}</span>
                    <span><strong>CFOP:</strong> {item.CFOP}</span>
                    <span><strong>Qtd:</strong> {formatNumber(item.qCom)}</span>
                    <span><strong>Unit:</strong> {formatCurrency(item.vUnCom)}</span>
                    <span className="font-bold text-foreground"><strong>Total:</strong> {formatCurrency(item.vProd)}</span>
                  </div>

                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-xs font-semibold text-primary flex items-center gap-1 list-none">
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      Ver Detalhamento Tributário
                    </summary>

                    <div className="mt-3 space-y-3 border-t pt-3 text-xs animate-fade-in">
                      {/* ICMS */}
                      {(item.vICMS != null || item.pICMS != null) && (
                        <div className="border-l-4 border-blue-400 pl-3">
                          <h4 className="font-semibold flex items-center gap-1 text-blue-600"><Percent size={14} /> ICMS (CST {item.CST_ICMS})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            <span>BC: {formatCurrency(item.vBC)}</span>
                            <span>Alíquota: {formatPercent(item.pICMS)}</span>
                            <span>Red. BC: {formatPercent(item.pRedBC)}</span>
                            <span>Valor: {formatCurrency(item.vICMS)}</span>
                          </div>
                        </div>
                      )}

                      {/* ICMS ST */}
                      {(item.vICMSST != null || item.pICMSST != null) && (
                        <div className="border-l-4 border-indigo-400 pl-3">
                          <h4 className="font-semibold flex items-center gap-1 text-indigo-600"><Calculator size={14} /> ICMS ST</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            <span>BC ST: {formatCurrency(item.vBCST)}</span>
                            <span>% MVA: {formatPercent(item.pMVAST)}</span>
                            <span>Alíquota ST: {formatPercent(item.pICMSST)}</span>
                            <span>Valor: {formatCurrency(item.vICMSST)}</span>
                          </div>
                        </div>
                      )}

                      {/* PIS e COFINS */}
                      {(item.vPIS != null || item.vCOFINS != null) && (
                        <div className="border-l-4 border-green-400 pl-3">
                          <h4 className="font-semibold flex items-center gap-1 text-green-600"><Percent size={14} /> PIS / COFINS</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            <span>PIS: {formatCurrency(item.vPIS)} ({formatPercent(item.pPIS)}) (CST {item.CST_PIS})</span>
                            <span>COFINS: {formatCurrency(item.vCOFINS)} ({formatPercent(item.pCOFINS)}) (CST {item.CST_COFINS})</span>
                            <span className="col-span-2">BC: {formatCurrency(item.vProd)}</span>
                          </div>
                        </div>
                      )}

                      {/* IPI */}
                      {item.vIPI != null && item.vIPI > 0 && (
                        <div className="border-l-4 border-orange-400 pl-3">
                          <h4 className="font-semibold flex items-center gap-1 text-orange-600"><Percent size={14} /> IPI (CST {item.CST_IPI})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                            <span>Alíquota: {formatPercent(item.pIPI)}</span>
                            <span>Valor: {formatCurrency(item.vIPI)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                  {/* Adiciona o componente de sugestão */}
                  <SugestaoERP item={item} />
                </div>
              ))}
            </div>
          </section>

          {/* Totais */}
          <section className="border-t pt-6">
            <h3 className="text-xl font-bold mb-4">Totais da Nota</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                <div className="border p-4 rounded-lg bg-secondary/30 space-y-2">
                    <p className="font-semibold text-base mb-2">Composição do Valor Total</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">Produtos:</span> <strong>{formatCurrency(danfeData.total?.vProd)}</strong></div>
                    {danfeData.total?.vFrete > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) Frete:</span> {formatCurrency(danfeData.total?.vFrete)}</div>}
                    {danfeData.total?.vST > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) ICMS ST:</span> {formatCurrency(danfeData.total?.vST)}</div>}
                    {danfeData.total?.vIPI > 0 && <div className="flex justify-between"><span className="text-muted-foreground">(+) IPI:</span> {formatCurrency(danfeData.total?.vIPI)}</div>}
                    {danfeData.total?.vDesc > 0 && <div className="flex justify-between text-destructive"><span>(-) Descontos:</span> - {formatCurrency(danfeData.total?.vDesc)}</div>}
                    <div className="flex justify-between font-bold text-lg mt-2 border-t pt-2"><span className="text-foreground">TOTAL DA NOTA:</span> <span className="text-foreground">{formatCurrency(danfeData.total?.vNF)}</span></div>
                </div>

                <div className="border p-4 rounded-lg bg-secondary/30 space-y-2">
                    <p className="font-semibold text-base mb-2">Resumo de Tributos (Informativo)</p>
                    <div className="flex justify-between"><span className="text-muted-foreground">BC ICMS:</span> {formatCurrency(danfeData.total?.vBC)}</div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor ICMS:</span> {formatCurrency(danfeData.total?.vICMS)}</div>
                    <div className="flex justify-between"><span className="text-muted-foreground">PIS+COFINS:</span> {formatCurrency((danfeData.total?.vPIS || 0) + (danfeData.total?.vCOFINS || 0))}</div>
                    {danfeData.total?.vTotTrib > 0 && (
                      <p className="font-medium text-foreground mt-2 pt-2 border-t">Aprox. Tributos: {formatCurrency(danfeData.total?.vTotTrib)}</p>
                    )}
                </div>
            </div>
          </section>
          
          {/* Outras Seções (Destinatário, Faturas, etc.) */}

        </div>
      )}
    </div>
  );
}