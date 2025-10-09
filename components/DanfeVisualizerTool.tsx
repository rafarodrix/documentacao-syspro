'use client';

import { useState, ChangeEvent } from 'react';
import { UploadCloud, Loader, AlertTriangle, Package, Truck, Landmark, Info, ChevronDown } from 'lucide-react';

// --- Interfaces de Tipos (Atualizadas para receber todos os dados) ---
interface ItemFiscalData {
  cProd: string; xProd: string; NCM: string; CFOP: string;
  qCom: number; vUnCom: number; vProd: number;
  // ICMS
  vBC: string; pICMS: string; vICMS: string; pRedBC: string;
  // ICMS ST
  vBCST: string; pMVAST: string; pICMSST: string; vICMSST: string;
  // Outros Tributos
  vIPI: string; pPIS: string; vPIS: string; pCOFINS: string; vCOFINS: string;
  vFrete: string;
  vSeg: string;
  vOutro: string;
}
interface DanfeData {
  ide: { nNF: string; serie: string; dhEmi: string; natOp: string; CFOP: string; mod: string; tpNF: string; cNF: string };
  emit: { xNome: string; CNPJ: string; IE: string; enderEmit: string; }; 
  dest: { xNome: string; doc: string; IE: string; enderDest: string; };
  transp: { modFrete: string; transporta: any; veicTransp: any; vol: any[] };
  det: ItemFiscalData[];
  total: any;
  cobr: any[];
  infAdic: { infCpl: string; infAdFisco: string };
  chave: string;
}

// --- Funções Auxiliares de Formatação ---
const formatCurrency = (value: any) => value ? Number(value).toFixed(2) : '0.00';
const formatPercent = (value: any) => value ? `${Number(value).toFixed(2)}%` : '0.00%';
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
      {/* Área de Upload Centralizada */}
      <div className="flex justify-center max-w-full mb-8">
          <label htmlFor="xml-upload" className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors w-full max-w-md">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="font-semibold text-primary">Selecionar Arquivo XML</span>
              <span className="text-xs text-muted-foreground mt-1">Clique para escolher ou arraste um arquivo aqui</span>
              <input id="xml-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
          </label>
      </div>

      {/* Status de Carregamento ou Erro */}
      {isLoading && <div className="flex items-center justify-center gap-2 text-muted-foreground"><Loader className="animate-spin" size={20} /> Processando XML...</div>}
      {error && <div className="flex items-center gap-2 text-red-500 bg-red-100 p-3 rounded-md"><AlertTriangle size={20} /> {error}</div>}

      {/* Visualização da DANFE */}
      {danfeData && (
        <div className="border rounded-lg p-4 md:p-8 max-w-5xl bg-card animate-fade-in space-y-6 mx-auto">
          
          {/* Cabeçalho Compacto */}
        <section className="border-b pb-4 space-y-4">
            {/* Bloco 1: Emitente */}
            <div className="text-center">
                <h2 className="text-xl font-bold">{danfeData.emit?.xNome}</h2>
                <p className="text-sm text-muted-foreground">CNPJ: {danfeData.emit?.CNPJ}</p>
            </div>

            {/* Bloco 2: Detalhes da Nota em Grid */}
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

            {/* Bloco 3: Chave de Acesso */}
            <div className="font-mono text-xs text-center bg-secondary p-2 rounded break-all" title="Chave de Acesso">
                <span className="font-semibold text-foreground">Chave:</span> {danfeData.chave}
            </div>
        </section>
                
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <section>
              <h3 className="text-lg font-bold mb-2">Destinatário</h3>
              <p className="font-medium">{danfeData.dest?.xNome}</p>
              <p className="text-sm text-muted-foreground">CNPJ/CPF: {danfeData.dest?.doc}</p>
              <p className="text-sm text-muted-foreground">IE: {danfeData.dest?.IE}</p>
              <p className="text-sm text-muted-foreground">{danfeData.dest?.enderDest}</p>
            </section>
            
            {/* Faturas */}
            {danfeData.cobr.length > 0 && (
            <section>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Landmark size={20} /> Faturas / Duplicatas</h3>
                <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-1">Nº</th><th className="text-left py-1">Vencimento</th><th className="text-right py-1">Valor</th></tr></thead>
                    <tbody>
                        {danfeData.cobr.map((dup, i) => (
                            <tr key={i} className="text-muted-foreground"><td className="py-1">{dup.nDup}</td><td className="py-1">{dup.dVenc}</td><td className="text-right py-1">R$ {formatCurrency(dup.vDup)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </section>
            )}
          </div>

          {/* Transporte */}
          <section className="border-t pt-4">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Truck size={20} /> Transporte e Frete</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-semibold">Modalidade:</span><p className="text-muted-foreground">{danfeData.transp.modFrete}</p></div>
                {danfeData.transp.transporta && <div><span className="font-semibold">Transportadora:</span><p className="text-muted-foreground">{danfeData.transp.transporta.xNome} - {danfeData.transp.transporta.CNPJ}</p></div>}
                {danfeData.transp.vol[0] && <div><span className="font-semibold">Volumes:</span><p className="text-muted-foreground">{danfeData.transp.vol[0].qVol} {danfeData.transp.vol[0].esp || ''}</p></div>}
                {danfeData.transp.vol[0] && <div><span className="font-semibold">Peso Bruto/Líq.:</span><p className="text-muted-foreground">{formatCurrency(danfeData.transp.vol[0].pesoB)} / {formatCurrency(danfeData.transp.vol[0].pesoL)} kg</p></div>}
            </div>
          </section>

          {/* Itens */}
        <section className="border-t pt-4">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Package size={20} /> Itens da Nota</h3>
                    <div className="space-y-4">
                        {danfeData.det.map((item, index) => (
                            <div key={index} className="text-sm border rounded-lg p-4 bg-secondary/30">
                                {/* INFORMAÇÕES GERAIS DO ITEM (SEMPRE VISÍVEIS) */}
                                <p className="font-bold text-base text-foreground">({item.cProd}) {item.xProd}</p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2 mt-2 text-muted-foreground">
                                    <span><span className="font-semibold text-foreground">NCM:</span> {item.NCM || '-'}</span>
                                    <span><span className="font-semibold text-foreground">CFOP:</span> {item.CFOP || '-'}</span>
                                    <span><span className="font-semibold text-foreground">Qtd:</span> {item.qCom}</span>
                                    <span><span className="font-semibold text-foreground">Vl. Unit:</span> R$ {formatCurrency(item.vUnCom)}</span>
                                    <span className="font-bold text-foreground text-base"><span className="font-semibold">Vl. Total:</span> R$ {formatCurrency(item.vProd)}</span>
                                </div>
                                
                                {/* BOTÃO EXPANSÍVEL PARA OS TRIBUTOS */}
                                <details className="mt-4 group">
                                    <summary className="cursor-pointer text-xs font-semibold text-primary list-none flex items-center gap-1">
                                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                                        Ver Detalhes Fiscais
                                    </summary>

                                    {/* CONTEÚDO EXPANSÍVEL (TRIBUTOS E OUTROS VALORES) */}
                                    <div className="pt-3 mt-3 border-t border-border/50 animate-fade-in space-y-3">
                                        {/* SEÇÃO DE TRIBUTOS DO ITEM */}
                                        <div className="space-y-2 text-xs">
                                            <h4 className="font-semibold text-sm text-foreground mb-2">Tributos</h4>
                                            
                                            {(item.vICMS || item.pICMS) && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                                    <span className="font-semibold">ICMS:</span>
                                                    <span>BC: R$ {formatCurrency(item.vBC)}</span>
                                                    <span>Alíquota: {formatPercent(item.pICMS)}</span>
                                                    <span>Valor: R$ {formatCurrency(item.vICMS)}</span>
                                                </div>
                                            )}

                                            {(item.vICMSST || item.pICMSST) && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                                    <span className="font-semibold">ICMS ST:</span>
                                                    <span>BC: R$ {formatCurrency(item.vBCST)}</span>
                                                    {/* MVA ADICIONADO DE VOLTA */}
                                                    <span>% MVA: {formatPercent(item.pMVAST)}</span>
                                                    <span>Alíquota: {formatPercent(item.pICMSST)} = R$ {formatCurrency(item.vICMSST)}</span>
                                                </div>
                                            )}

                                            {(item.vPIS || item.pPIS) && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                                    <span className="font-semibold">PIS:</span>
                                                    <span>BC: R$ {formatCurrency(item.vProd)}</span>
                                                    <span>Alíquota: {formatPercent(item.pPIS)}</span>
                                                    <span>Valor: R$ {formatCurrency(item.vPIS)}</span>
                                                </div>
                                            )}

                                            {(item.vCOFINS || item.pCOFINS) && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                                    <span className="font-semibold">COFINS:</span>
                                                    <span>BC: R$ {formatCurrency(item.vProd)}</span>
                                                    <span>Alíquota: {formatPercent(item.pCOFINS)}</span>
                                                    <span>Valor: R$ {formatCurrency(item.vCOFINS)}</span>
                                                </div>
                                            )}

                                            {item.vIPI && parseFloat(item.vIPI) > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                                                    <span className="font-semibold">IPI:</span>
                                                    <span></span>
                                                    <span></span>
                                                    <span>Valor: R$ {formatCurrency(item.vIPI)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* SEÇÃO OUTROS VALORES DO ITEM */}
                                        {(item.vFrete || item.vSeg || item.vOutro) && (
                                            <div className="border-t mt-3 pt-3 space-y-2 text-xs">
                                                <h4 className="font-semibold text-sm text-foreground mb-2">Outros Valores do Item</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
                                                    {parseFloat(item.vFrete) > 0 && <span><span className="font-semibold">Frete:</span> R$ {formatCurrency(item.vFrete)}</span>}
                                                    {parseFloat(item.vSeg) > 0 && <span><span className="font-semibold">Seguro:</span> R$ {formatCurrency(item.vSeg)}</span>}
                                                    {parseFloat(item.vOutro) > 0 && <span><span className="font-semibold">Outras Desp.:</span> R$ {formatCurrency(item.vOutro)}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                </section>
          
          {/* Totais */}
          <section className="border-t pt-4 flex justify-end">
             <div className="w-full max-w-sm space-y-1 text-sm">
                <h3 className="text-lg font-bold mb-2 text-left">Totais da Nota</h3>
                <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Vl. Total dos Produtos:</span><span>R$ {formatCurrency(danfeData.total?.vProd)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vl. Frete:</span><span>R$ {formatCurrency(danfeData.total?.vFrete)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vl. Seguro:</span><span>R$ {formatCurrency(danfeData.total?.vSeg)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vl. Desconto:</span><span>R$ {formatCurrency(danfeData.total?.vDesc)}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Vl. Outras Despesas:</span><span>R$ {formatCurrency(danfeData.total?.vOutro)}</span></div>
                
                <div className="flex justify-between"><span className="text-muted-foreground">Base de Cálculo ICMS:</span><span>R$ {formatCurrency(danfeData.total?.vBC)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Total ICMS:</span><span>R$ {formatCurrency(danfeData.total?.vICMS)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base de Cálculo ICMS ST:</span><span>R$ {formatCurrency(danfeData.total?.vBCST)}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Valor Total ICMS ST:</span><span>R$ {formatCurrency(danfeData.total?.vICMSST)}</span></div>
                
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Total IPI:</span><span>R$ {formatCurrency(danfeData.total?.vIPI)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Total PIS:</span><span>R$ {formatCurrency(danfeData.total?.vPIS)}</span></div>
                <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Valor Total COFINS:</span><span>R$ {formatCurrency(danfeData.total?.vCOFINS)}</span></div>
                
                <div className="flex justify-between"><span className="text-muted-foreground">Vl. Aprox. Tributos:</span><span>R$ {formatCurrency(danfeData.total?.vTotTrib)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2"><span className="text-foreground">VALOR TOTAL DA NOTA:</span><span className="text-foreground">R$ {formatCurrency(danfeData.total?.vNF)}</span></div>
             </div>
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