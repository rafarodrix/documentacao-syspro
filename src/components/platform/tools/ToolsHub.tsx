"use client";

import Link from "next/link";
import {
    FileSearch,
    FileText,
    Calculator,
    Percent,
    BarChart3,
    TrendingUp
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// MAGIC UI
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";

type Tool = {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    color?: string;
};

interface ToolsHubProps {
    basePath: string;
}

const TOOL_GROUPS: {
    group: string;
    tools: Tool[];
}[] = [
        {
            group: "Simulações",
            tools: [
                {
                    title: "Custos Fixos por Departamento",
                    description: "Simule despesas e impacto na margem de lucro.",
                    icon: BarChart3,
                    href: "custos-departamento",
                    color: "text-pink-500"
                }
            ]
        },
        {
            group: "Calculadoras",
            tools: [
                {
                    title: "DIFAL",
                    description: "Calcule o Diferencial de Alíquota.",
                    icon: Calculator,
                    href: "calculadora-difal",
                    color: "text-green-500"
                },
                {
                    title: "Precificação",
                    description: "Calcule markup, margem e preço de venda.",
                    icon: Percent,
                    href: "calculadora-precificacao",
                    color: "text-emerald-500"
                },
                {
                    title: "Ponto de Equilíbrio",
                    description: "Descubra o faturamento necessário para cobrir custos.",
                    icon: TrendingUp,
                    href: "analise-ponto-equilibrio",
                    color: "text-purple-500"
                }
            ]
        },
        {
            group: "Utilitários",
            tools: [
                {
                    title: "Analisador XML",
                    description: "Valide e analise arquivos XML de NFe.",
                    icon: FileSearch,
                    href: "analisador-xml",
                    color: "text-blue-500"
                },
                {
                    title: "Visualizador DANFE",
                    description: "Gere e visualize DANFE a partir de XML.",
                    icon: FileText,
                    href: "visualizador-danfe",
                    color: "text-orange-500"
                }
            ]
        }
    ];

export function ToolsHub({ basePath }: ToolsHubProps) {
    return (
        <div className="space-y-12">
            {TOOL_GROUPS.map(({ group, tools }, indexGroup) => (
                <BlurFade
                    key={group}
                    delay={indexGroup * 0.1}
                    inView
                    className="space-y-6"
                >
                    <h2 className="text-xl font-semibold">{group}</h2>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {tools.map((tool, indexTool) => {
                            const Icon = tool.icon;

                            return (
                                <BlurFade
                                    key={tool.href}
                                    delay={0.15 + indexTool * 0.08}
                                    inView
                                >
                                    <Link href={`${basePath}/${tool.href}`} className="group block">
                                        <ShineBorder
                                            className="rounded-xl p-[1px] transition-all"
                                            borderWidth={2}
                                            color={tool.color?.replace("text", "from") ?? "from-primary"}
                                        >
                                            <Card
                                                className={cn(
                                                    "rounded-xl p-4 bg-card hover:bg-card/90 transition-all",
                                                    "group-hover:shadow-xl group-hover:shadow-primary/10"
                                                )}
                                            >
                                                <CardHeader className="p-0 pb-2">
                                                    <CardTitle className="flex items-center gap-2 text-lg">
                                                        <Icon
                                                            className={cn(
                                                                "w-6 h-6 transition-all drop-shadow-sm",
                                                                tool.color,
                                                                "group-hover:scale-110"
                                                            )}
                                                        />
                                                        {tool.title}
                                                    </CardTitle>
                                                    <CardDescription>{tool.description}</CardDescription>
                                                </CardHeader>
                                            </Card>
                                        </ShineBorder>
                                    </Link>
                                </BlurFade>
                            );
                        })}
                    </div>
                </BlurFade>
            ))}
        </div>
    );
}
