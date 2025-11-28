import Link from "next/link";
import { FileSearch, Calculator, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ToolsHub({ basePath }: { basePath: string }) {
    const tools = [
        {
            title: "Analisador XML",
            desc: "Valide e analise arquivos XML de NFe.",
            icon: FileSearch,
            href: `${basePath}/analisador`,
            color: "text-blue-500"
        },
        {
            title: "Calculadora DIFAL",
            desc: "Simule o Diferencial de Alíquota.",
            icon: Calculator,
            href: `${basePath}/calculadora-difal`,
            color: "text-green-500"
        },
        {
            title: "Visualizador DANFE",
            desc: "Visualize o PDF da nota fiscal.",
            icon: FileText,
            href: `${basePath}/visualizador-danfe`,
            color: "text-orange-500"
        }
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
                <Link key={tool.href} href={tool.href} className="group">
                    <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <tool.icon className={`w-6 h-6 ${tool.color}`} />
                                {tool.title}
                            </CardTitle>
                            <CardDescription>{tool.desc}</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    );
}