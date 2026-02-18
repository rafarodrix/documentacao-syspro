import { ChangeEvent } from 'react';
import { Tag, X } from 'lucide-react';
import { PricingResult, PricingState, ModoCalculo } from '../types';
import { formatarMoedaInput } from '@/lib/formatters';

interface Step2Props {
    valores: PricingState;
    modoCalculo: ModoCalculo;
    setModoCalculo: (m: ModoCalculo) => void;
    handleCurrencyChange: (campo: keyof PricingState) => (e: ChangeEvent<HTMLInputElement>) => void;
    handleSimpleChange: (campo: keyof PricingState) => (e: ChangeEvent<HTMLInputElement>) => void;
    resultados: PricingResult | null;
    handleClear: () => void;
}

export function Step2Precificacao({
    valores, modoCalculo, setModoCalculo,
    handleCurrencyChange, handleSimpleChange,
    resultados, handleClear
}: Step2Props) {

    // Helpers para manipular a mudança de modo ao digitar
    const onPrecoVendaChange = (e: ChangeEvent<HTMLInputElement>) => {
        setModoCalculo('venda');
        handleCurrencyChange('precoVenda')(e);
    };

    const onLucroValorChange = (e: ChangeEvent<HTMLInputElement>) => {
        setModoCalculo('lucro_valor');
        handleCurrencyChange('lucroLiquidoDesejado')(e);
    };

    const onMargemPercentualChange = (e: ChangeEvent<HTMLInputElement>) => {
        setModoCalculo('lucro_percentual');
        // Remove caracteres não numéricos para margem (permite vírgula)
        const val = e.target.value.replace(/[^0-9,.]/g, '');
        // Aqui você precisaria adaptar o handleSimpleChange ou criar um específico se o handleSimpleChange 
        // espera o evento completo. Assumindo que handleSimpleChange atualiza direto:
        // Nota: Para simplificar, vou assumir que o pai espera o evento
        handleSimpleChange('margemLiquidaDesejada')(e);
    };

    return (
        <div className="bg-card border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Tag size={20} className="text-primary" />
                    Passo 2: Precifique seu Produto
                </h3>
                <button
                    onClick={handleClear}
                    className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                    <X size={16} /> Limpar Tudo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 text-sm mt-4 items-start">

                {/* Coluna da Esquerda: Custo e Venda */}
                <div className="space-y-4">
                    <div>
                        <label className="font-medium text-muted-foreground block mb-1.5">Custo do Produto (CMV)</label>
                        <input
                            className="w-full p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            inputMode="decimal"
                            placeholder="Ex: 100,00"
                            value={valores.custoAquisicao}
                            onChange={handleCurrencyChange('custoAquisicao')}
                        />
                    </div>
                    <div>
                        <label className="font-medium text-muted-foreground block mb-1.5">Impostos sobre Venda (%)</label>
                        <input
                            className="w-full p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            type="number"
                            placeholder="Ex: 18"
                            value={valores.impostosVenda}
                            onChange={handleSimpleChange('impostosVenda')}
                        />
                    </div>
                    <div>
                        <label className={`font-medium block mb-1.5 ${modoCalculo === 'venda' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            Preço de Venda
                        </label>
                        <input
                            className={`w-full p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all ${modoCalculo === 'venda' ? 'border-primary ring-1 ring-primary/20' : ''
                                }`}
                            type="text"
                            inputMode="decimal"
                            placeholder="R$ 0,00"
                            // Se não estiver editando o preço, mostra o valor calculado (preview)
                            value={modoCalculo !== 'venda' && resultados
                                ? (resultados.venda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : valores.precoVenda
                            }
                            onChange={onPrecoVendaChange}
                        />
                    </div>
                </div>

                {/* Coluna da Direita: Metas de Lucro */}
                <div className="bg-secondary/30 border border-secondary p-4 rounded-lg space-y-4">
                    <div>
                        <label className="font-medium text-foreground block">Definir Meta de Lucro</label>
                        <p className="text-xs text-muted-foreground mt-1">
                            Edite um dos campos abaixo para calcular o preço de venda reverso.
                        </p>
                    </div>

                    <div>
                        <label className={`text-xs font-semibold block mb-1.5 ${modoCalculo === 'lucro_valor' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Lucro Líquido Desejado (R$)
                        </label>
                        <input
                            className={`w-full p-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all ${modoCalculo === 'lucro_valor' ? 'border-primary ring-1 ring-primary/20' : ''
                                }`}
                            type="text"
                            inputMode="decimal"
                            placeholder="R$ 0,00"
                            value={modoCalculo !== 'lucro_valor' && resultados
                                ? (resultados.lucroLiquido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : valores.lucroLiquidoDesejado
                            }
                            onChange={onLucroValorChange}
                        />
                    </div>

                    <div>
                        <label className={`text-xs font-semibold block mb-1.5 ${modoCalculo === 'lucro_percentual' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Margem Líquida Desejada (%)
                        </label>
                        <div className="relative">
                            <input
                                className={`w-full p-2 bg-background border rounded-md pr-8 focus:ring-2 focus:ring-primary/20 outline-none transition-all ${modoCalculo === 'lucro_percentual' ? 'border-primary ring-1 ring-primary/20' : ''
                                    }`}
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={modoCalculo !== 'lucro_percentual' && resultados
                                    ? (resultados.margemLiquidaPercent ?? 0).toFixed(2).replace('.', ',')
                                    : valores.margemLiquidaDesejada
                                }
                                onChange={onMargemPercentualChange}
                            />
                            <span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}