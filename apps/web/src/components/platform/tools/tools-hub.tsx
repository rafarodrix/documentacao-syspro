"use client";

import type { ElementType } from "react";
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
  Coins,
  Building2,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger, Badge } from "@dosc-syspro/ui";
import { MagicCard } from "@/components/magicui/magic-card";

type Category = "calculadoras" | "simuladores" | "utilitarios";

type Tool = {
  title: string;
  description: string;
  icon: ElementType;
  href: string;
  category: Category;
  badge?: string;
};

interface ToolsHubProps {
  basePath: string;
}

export function ToolsHub({ basePath }: ToolsHubProps) {
  const { theme } = useTheme();

  const tools: Tool[] = [
    {
      title: "Calculadora DIFAL",
      description: "Simule o Diferencial de Aliquota e Antecipacao de ICMS.",
      icon: Divide,
      href: `${basePath}/calculadora-difal`,
      category: "calculadoras",
    },
    {
      title: "Calculadora Precificacao",
      description: "Formacao de preco de venda, markup e margem de lucro.",
      icon: Coins,
      href: `${basePath}/calculadora-precificacao`,
      category: "calculadoras",
      badge: "Popular",
    },
    {
      title: "Ponto de Equilibrio",
      description: "Descubra quanto sua empresa precisa vender para nao ter prejuizo.",
      icon: TrendingUp,
      href: `${basePath}/analise-ponto-equilibrio`,
      category: "simuladores",
    },
    {
      title: "Custos por Departamento",
      description: "Simule o rateio de custos fixos entre setores da empresa.",
      icon: PieChart,
      href: `${basePath}/custos-departamento`,
      category: "simuladores",
    },
    {
      title: "Fator de Producao",
      description: "Defina a conversao de KG para Unidade de Estoque.",
      icon: PieChart,
      href: `${basePath}/fator-producao`,
      category: "simuladores",
    },
    {
      title: "Analisador XML",
      description: "Valide a estrutura e extraia dados de arquivos XML de NFe.",
      icon: FileSearch,
      href: `${basePath}/analisador-xml`,
      category: "utilitarios",
    },
    {
      title: "Visualizador DANFE",
      description: "Gere a visualizacao da DANFE (PDF) a partir do XML.",
      icon: FileText,
      href: `${basePath}/visualizador-danfe`,
      category: "utilitarios",
    },
    {
      title: "Consulta CNPJ",
      description: "Abra a consulta oficial da Receita com validacao local do CNPJ.",
      icon: Building2,
      href: `${basePath}/consulta-cnpj`,
      category: "utilitarios",
      badge: "Oficial",
    },
    {
      title: "Configuracao de Documentos",
      description: "Gerencie os documentos de sua empresa.",
      icon: FileText,
      href: `${basePath}/configuracao-documentos`,
      category: "utilitarios",
    },
  ];

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
              <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
            </MagicCard>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      <Tabs defaultValue="todos" className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:w-auto sm:grid-cols-4">
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
              <FileText className="w-4 h-4" /> Utilitarios
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TabsContent value="todos" className="mt-0">
            <ToolsGrid items={tools} />
          </TabsContent>

          <TabsContent value="calculadoras" className="mt-0">
            <ToolsGrid items={tools.filter((t) => t.category === "calculadoras")} />
          </TabsContent>

          <TabsContent value="simuladores" className="mt-0">
            <ToolsGrid items={tools.filter((t) => t.category === "simuladores")} />
          </TabsContent>

          <TabsContent value="utilitarios" className="mt-0">
            <ToolsGrid items={tools.filter((t) => t.category === "utilitarios")} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

