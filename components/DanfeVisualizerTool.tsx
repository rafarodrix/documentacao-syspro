'use client';

import { useState, ChangeEvent } from 'react';
import { UploadCloud, Loader, AlertTriangle, Package, Truck, Landmark, Info, ChevronDown } from 'lucide-react';
import { SugestaoERP } from './SugestaoERP';

// --- Interfaces de Tipos (Atualizadas) ---
interface ItemFiscalData {
  cProd: string; xProd: string; NCM: string; CFOP: string;
  qCom: number; vUnCom: number; vProd: number;
  CST_ICMS: string; vBC: string; pICMS: string; vICMS: string; pRedBC: string;
  vBCST: string; pMVAST: string; pICMSST: string; vICMSST: string; pRedBCST: string;
  CST_IPI: string; vIPI: string;
  CST_PIS: string; pPIS: string; vPIS: string;
  CST_COFINS: string; pCOFINS: string; vCOFINS: string;
  vFrete: string; vSeg: string; vOutro: string;
}
interface DanfeData {
  ide: { nNF: string; serie: string; dhEmi: string; natOp: string; CFOP: string; mod: string; tpNF: string; cNF: string };
  emit: { xNome: string; CNPJ: string; IE: string; enderEmit: string; UF: string; }; 
  dest: { xNome: string; doc: string; IE: string; enderDest: string; UF: string; };
  transp: { modFrete: string; transporta: any; veicTransp: any; vol: any[] };
  det: ItemFiscalData[];
  total: any;
  cobr: any[];
  infAdic: { infCpl: string; infAdFisco: string };
  chave: string;
}

// --- Funções Auxiliares de Formatação ---
const formatCurrency = (value: any) => (value ? Number(value).toFixed(2) : '0.00');
const formatPercent = (value: any) => (value ? `${Number(value).toFixed(2)}%` : '0.00%');
const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
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
      const response = await fetch('/api/visualizar-danfe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro no servidor.');
      }

      const data: DanfeData = await response.json();
      setDanfeData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Área de Upload */}
      <div className="flex justify-center max-w-full mb-8">
          <label htmlFor="xml-upload" className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors w-full max-w-md">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="font-semibold text-primary">Selecionar Arquivo XML</span>
              <span className="text-xs text-muted-foreground mt-1">Clique para escolher ou arraste um arquivo aqui</span>
              <input id="xml-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
          </label>
      </div>

      {isLoading && <div className="flex items-center justify-center gap-2 text-muted-foreground"><Loader className="animate-spin" size={20} /> Processando XML...</div>}
      {error && <div className="flex items-center gap-2 text-red-500 bg-red-100 p-3 rounded-md"><AlertTriangle size={20} /> {error}</div>}

      {danfeData && (
        <div className="border rounded-lg p-4 md:p-8 max-w-5xl bg-card animate-fade-in space-y-6 mx-auto">
          
          <section className="border-b pb-4 space-y-4">
              <div className="text-center">
                  <h2 className="text-xl font-bold">{danfeData.emit?.xNome}</h2>
                  <p className="text-sm text-muted-foreground">CNPJ: {danfeData.emit?.CNPJ} - <span className="font-semibold">UF: {danfeData.emit?.UF}</span></p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm border-t border-b py-4">
                  <div>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Documento</span>
                      <p className="text-base font-medium">NF-e: {danfeData.ide.nNF} | Série: {danfeData.ide.serie} | Mod: {danfeData.ide.mod}</p>
                  </div>
                  <div>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Emissão</span>
                      <p>{formatDate(danfeData.ide.dhEmi)}</p>
                  </div>
                  <div>
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Operação</span>
                      <p>{danfeData.ide.tpNF}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Natureza da Operação</span>
                      <p className="text-lg font-medium lowercase capitalize">{danfeData.ide.natOp || 'Não informado'}</p>
                  </div>
              </div>
              <div className="font-mono text-xs text-center bg-secondary p-2 rounded break-all" title="Chave de Acesso">
                  <span className="font-semibold text-foreground">Chave:</span> {danfeData.chave}
              </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <section>
              <h3 className="text-lg font-bold mb-2">Destinatário</h3>
              <p className="font-medium">{danfeData.dest?.xNome}</p>
              <p className="text-sm text-muted-foreground">CNPJ/CPF: {danfeData.dest?.doc} - <span className="font-semibold">UF: {danfeData.dest?.UF}</span></p>
              <p className="text-sm text-muted-foreground">IE: {danfeData.dest?.IE}</p>
              <p className="text-sm text-muted-foreground">{danfeData.dest?.enderDest}</p>
            </section>
            
            {danfeData.cobr?.length > 0 && (
            <section>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Landmark size={20} /> Faturas / Duplicatas</h3>
                <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-1">Nº</th><th className="text-left py-1">Vencimento</th><th className="text-right py-1">Valor</th></tr></thead>
                    <tbody>
                        {danfeData.cobr.map((dup: any, i: number) => (
                            <tr key={i} className="text-muted-foreground"><td className="py-1">{dup.nDup}</td><td className="py-1">{dup.dVenc}</td><td className="text-right py-1">R$ {formatCurrency(dup.vDup)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </section>
            )}
          </div>
          
          <section className="border-t pt-4">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Truck size={20} /> Transporte e Frete</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-semibold">Modalidade:</span><p className="text-muted-foreground">{danfeData.transp.modFrete}</p></div>
                {danfeData.transp.transporta && <div><span className="font-semibold">Transportadora:</span><p className="text-muted-foreground">{danfeData.transp.transporta.xNome} - {danfeData.transp.transporta.CNPJ}</p></div>}
                {danfeData.transp.vol[0] && <div><span className="font-semibold">Volumes:</span><p className="text-muted-foreground">{danfeData.transp.vol[0].qVol} {danfeData.transp.vol[0].esp || ''}</p></div>}
                {danfeData.transp.vol[0] && <div><span className="font-semibold">Peso Bruto/Líq.:</span><p className="text-muted-foreground">{formatCurrency(danfeData.transp.vol[0].pesoB)} / {formatCurrency(danfeData.transp.vol[0].pesoL)} kg</p></div>}
            </div>
          </section>

          <section className="border-t pt-4">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Package size={20} /> Itens da Nota</h3>
            <div className="space-y-4">
                {danfeData.det.map((item, index) => (
                    <div key={index} className="text-sm border rounded-lg p-4 bg-secondary/30">
                        <p className="font-bold text-base text-foreground">({item.cProd}) {item.xProd}</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground">
                            <span><span className="font-semibold text-foreground">NCM:</span> {item.NCM || '-'}</span>
                            <span><span className="font-semibold text-foreground">CFOP:</span> {item.CFOP || '-'}</span>
                            <span><span className="font-semibold text-foreground">Qtd:</span> {item.qCom}</span>
                            <span><span className="font-semibold text-foreground">Vl. Unit:</span> R$ {formatCurrency(item.vUnCom)}</span>
                            <span className="font-bold text-foreground text-base"><span className="font-semibold">Vl. Total:</span> R$ {formatCurrency(item.vProd)}</span>
                        </div>
                        
                        <details className="mt-4 group">
                            <summary className="cursor-pointer text-xs font-semibold text-primary list-none flex items-center gap-1">
                                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                                Ver Detalhes Fiscais
                            </summary>
                            <div className="pt-3 mt-3 border-t border-border/50 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                                <div className="space-y-3">
                                    {(item.vICMS || item.pICMS) && (
                                        <div>
                                            <p className="font-bold text-sm mb-1 border-b">ICMS</p>
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <span><span className="font-semibold">CST:</span> {item.CST_ICMS}</span>
                                                <span><span className="font-semibold">BC:</span> R$ {formatCurrency(item.vBC)}</span>
                                                <span><span className="font-semibold">Alíquota:</span> {formatPercent(item.pICMS)}</span>
                                                <span><span className="font-semibold">Valor:</span> R$ {formatCurrency(item.vICMS)}</span>
                                                {item.pRedBC && parseFloat(item.pRedBC) > 0 && 
                                                    <span className="col-span-2"><span className="font-semibold">% Red. BC:</span> {formatPercent(item.pRedBC)}</span>}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {item.vIPI && parseFloat(item.vIPI) > 0 && (
                                        <div>
                                            <p className="font-bold text-sm mb-1 border-b">IPI</p>
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <span><span className="font-semibold">CST:</span> {item.CST_IPI}</span>
                                                <span><span className="font-semibold">Valor:</span> R$ {formatCurrency(item.vIPI)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {(item.vICMSST || item.pICMSST) && (
                                        <div>
                                            <p className="font-bold text-sm mb-1 border-b">ICMS ST</p>
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <span><span className="font-semibold">BC:</span> R$ {formatCurrency(item.vBCST)}</span>
                                                <span><span className="font-semibold">% MVA:</span> {formatPercent(item.pMVAST)}</span>
                                                <span><span className="font-semibold">Alíquota:</span> {formatPercent(item.pICMSST)}</span>
                                                <span><span className="font-semibold">Valor:</span> R$ {formatCurrency(item.vICMSST)}</span>
                                                {item.pRedBCST && parseFloat(item.pRedBCST) > 0 && 
                                                    <span className="col-span-2"><span className="font-semibold">% Red. BC ST:</span> {formatPercent(item.pRedBCST)}</span>}
                                            </div>
                                        </div>
                                    )}
                                    {(item.vPIS || item.pPIS || item.vCOFINS || item.pCOFINS) && (
                                        <div>
                                            <p className="font-bold text-sm mb-1 border-b">PIS / COFINS</p>
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <span><span className="font-semibold">CST PIS:</span> {item.CST_PIS}</span>
                                                <span><span className="font-semibold">Vl. PIS:</span> R$ {formatCurrency(item.vPIS)}</span>
                                                <span><span className="font-semibold">CST COFINS:</span> {item.CST_COFINS}</span>
                                                <span><span className="font-semibold">Vl. COFINS:</span> R$ {formatCurrency(item.vCOFINS)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>
                        <SugestaoERP item={item} />
                    </div>
                ))}
            </div>
          </section>
          
          <section className="border-t pt-4 flex justify-end">
             {/* ... (Totais) ... */}
          </section>

          {/* Informações Adicionais */}
          {(danfeData.infAdic?.infCpl || danfeData.infAdic?.infAdFisco) && (
            <section className="border-t pt-4 text-sm">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Info size={20} /> Informações Complementares</h3>
                {danfeData.infAdic.infCpl && <p className="text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded-md mb-2">{danfeData.infAdic.infCpl}</p>}
                {danfeData.infAdic.infAdFisco && <p className="text-muted-foreground whitespace-pre-wrap bg-secondary p-3 rounded-md">({danfeData.infAdic.infAdFisco})</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}