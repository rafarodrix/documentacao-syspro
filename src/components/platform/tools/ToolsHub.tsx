import Link from "next/link";
import { FileSearch, Calculator, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export function ToolsHub({ basePath }: ToolsHubProps) {

    const tools: Tool[] = [
        {
            title: "Analisador XML",
            description: "Valide e analise arquivos XML de NFe.",
            icon: FileSearch,
            href: `${basePath}/analisador-xml`,
            color: "text-blue-500"
        },
        {
            title: "Calculadora DIFAL",
            description: "Simule o Diferencial de Alíquota.",
            icon: Calculator,
            href: `${basePath}/calculadora-difal`,
            color: "text-green-500"
        },
        {
            title: "Calculadora Precificação",
            description: "Calcule custos, markup e margem automaticamente.",
            icon: Calculator,
            href: `${basePath}/calculadora-precificacao`,
            color: "text-emerald-500"
        },
        {
            title: "Visualizador DANFE",
            description: "Visualize e gere DANFE a partir de XML.",
            icon: FileText,
            href: `${basePath}/visualizador-danfe`,
            color: "text-orange-500"
        },
        {
            title: "Ponto de Equilíbrio",
            description: "Calcule o ponto de equilíbrio do seu negócio.",
            icon: Calculator,
            href: `${basePath}/analise-ponto-equilibrio`,
            color: "text-purple-500"
        },
        {
            title: "Simulador de Custos Fixos por departamento",
            description: "Simule custos fixos e calcule margem de lucro.",
            icon: Calculator,
            href: `${basePath}/simulador-custos-fixos-departamento`,
            color: "text-pink-500"
        }
    ];

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
                const Icon = tool.icon;

                return (
                    <Link key={tool.href} href={tool.href} className="group">
                        <Card
                            className={cn(
                                "h-full transition-all border-muted hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5",
                                "group-hover:translate-y-[-2px] duration-200"
                            )}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Icon
                                        className={cn("w-6 h-6 transition-colors", tool.color)}
                                    />
                                    {tool.title}
                                </CardTitle>
                                <CardDescription>{tool.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
