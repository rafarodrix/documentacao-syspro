import { Segmento } from "./types";

export const BENCHMARKS: Record<Segmento, {
    saudavel: number;
    atencao: number;
    textoSaudavel: string;
    textoAtencao: string;
    textoPerigoso: string;
}> = {
    varejo: {
        saudavel: 25,
        atencao: 40,
        textoSaudavel: "Seus custos fixos estão bem controlados. Maior flexibilidade para promoções.",
        textoAtencao: "Nível que exige atenção. Estrutura pode estar cara para o faturamento atual.",
        textoPerigoso: "Sinal de alerta. Uma fatia muito grande da receita é consumida pela estrutura."
    },
    industria: {
        saudavel: 35,
        atencao: 55,
        textoSaudavel: "Excelente estrutura de custos para uma indústria. Indicador de eficiência.",
        textoAtencao: "Nível elevado. É crucial manter a produção em alta para diluir esses custos.",
        textoPerigoso: "Risco elevado. Estrutura produtiva pode ser grande demais para a demanda atual."
    },
    servicos: {
        saudavel: 30,
        atencao: 50,
        textoSaudavel: "Ótimo! Operação enxuta e eficiente, comum em alta rentabilidade.",
        textoAtencao: "Patamar comum. Foco deve ser garantir que a equipe/ferramentas gerem receita suficiente.",
        textoPerigoso: "Custos operacionais muito altos. Pode indicar equipe ociosa ou ferramentas caras."
    }
};