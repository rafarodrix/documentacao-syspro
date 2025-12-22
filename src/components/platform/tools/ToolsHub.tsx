"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import {
    FileSearch,
    Calculator,
    FileText,
    TrendingUp,
    PieChart,
    LayoutGrid,
    Divide,
    Coins
} from "lucide-react";

// Componentes UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MagicCard } from "@/components/magicui/magic-card";
import { Badge } from "@/components/ui/badge";

// --- Tipagem ---
type Category = "calculadoras" | "simuladores" | "utilitarios";

type Tool = {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    category: Category;
    badge?: string; // Opcional: para destacar ferramentas novas
};

interface ToolsHubProps {
    basePath: string;
}

export function ToolsHub({ basePath }: ToolsHubProps) {
    const { theme } = useTheme();

    // --- Dados das Ferramentas ---
    const tools: Tool[] = [
        // Calculadoras
        {
            title: "Calculadora DIFAL",
            description: "Simule o Diferencial de Alíquota e Antecipação de ICMS.",
            icon: Divide,
            href: `${basePath}/calculadora-difal`,
            category: "calculadoras"
        },
        {
            title: "Calculadora Precificação",
            description: "Formação de preço de venda, markup e margem de lucro.",
            icon: Coins,
            href: `${basePath}/calculadora-precificacao`,
            category: "calculadoras",
            badge: "Popular"
        },
        // Simuladores
        {
            title: "Ponto de Equilíbrio",
            description: "Descubra quanto sua empresa precisa vender para não ter prejuízo.",
            icon: TrendingUp,
            href: `${basePath}/analise-ponto-equilibrio`,
            category: "simuladores"
        },
        {
            title: "Custos por Departamento",
            description: "Simule o rateio de custos fixos entre setores da empresa.",
            icon: PieChart,
            href: `${basePath}/custos-departamento`,
            category: "simuladores"
        },
        {
            title: "Fator de Produção",
            description: "Defina a conversão de KG para Unidade de Estoque.",
            icon: PieChart,
            href: `${basePath}/fator-producao`,
            category: "simuladores"
        },
        // Utilitários
        {
            title: "Analisador XML",
            description: "Valide a estrutura e extraia dados de arquivos XML de NFe.",
            icon: FileSearch,
            href: `${basePath}/analisador-xml`,
            category: "utilitarios"
        },
        {
            title: "Visualizador DANFE",
            description: "Gere a visualização da DANFE (PDF) a partir do XML.",
            icon: FileText,
            href: `${basePath}/visualizador-danfe`,
            category: "utilitarios"
        },
        {
            title: "Configuração de Documentos",
            description: "Gerencie os documentos de sua empresa.",
            icon: FileText,
            href: `${basePath}/configuracao-documentos`,
            category: "utilitarios"
        }
    ];

    // --- Helper de Renderização ---
    const ToolsGrid = ({ items }: { items: Tool[] }) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tool) => {
                const Icon = tool.icon;
                return (
                    <Link key={tool.href} href={tool.href} className="group h-full">
                        <MagicCard
                            className="cursor-pointer flex-col items-start h-full p-6 shadow-sm hover:shadow-md transition-all border-border/50"
                            gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                        >
                            <div className="flex w-full items-start justify-between mb-4">
                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="w-6 h-6" />
                                </div>
                                {tool.badge && (
                                    <Badge variant="secondary" className="text-[10px] px-2 h-5">
                                        {tool.badge}
                                    </Badge>
                                )}
                            </div>

                            <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                                {tool.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {tool.description}
                            </p>
                        </MagicCard>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-8">
            <Tabs defaultValue="todos" className="w-full">

                {/* Cabeçalho das Abas */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-4 h-auto p-1">
                        <TabsTrigger value="todos" className="gap-2 py-2">
                            <LayoutGrid className="w-4 h-4" /> Todos
                        </TabsTrigger>
                        <TabsTrigger value="calculadoras" className="gap-2 py-2">
                            <Calculator className="w-4 h-4" /> Calculadoras
                        </TabsTrigger>
                        <TabsTrigger value="simuladores" className="gap-2 py-2">
                            <TrendingUp className="w-4 h-4" /> Simuladores
                        </TabsTrigger>
                        <TabsTrigger value="utilitarios" className="gap-2 py-2">
                            <FileText className="w-4 h-4" /> Utilitários
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Conteúdo das Abas */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TabsContent value="todos" className="mt-0">
                        <ToolsGrid items={tools} />
                    </TabsContent>

                    <TabsContent value="calculadoras" className="mt-0">
                        <ToolsGrid items={tools.filter(t => t.category === "calculadoras")} />
                    </TabsContent>

                    <TabsContent value="simuladores" className="mt-0">
                        <ToolsGrid items={tools.filter(t => t.category === "simuladores")} />
                    </TabsContent>

                    <TabsContent value="utilitarios" className="mt-0">
                        <ToolsGrid items={tools.filter(t => t.category === "utilitarios")} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}