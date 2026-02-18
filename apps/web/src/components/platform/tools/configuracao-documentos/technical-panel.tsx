import { Info, FileCode, Database, AlertTriangle, X, LucideIcon } from "lucide-react";
import { FIELD_METADATA } from "@/core/constants/field-metadata";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Utilitário padrão do Shadcn para classes

interface TechnicalPanelProps {
    focusedField: string | null;
    onClose: () => void;
}

// 1. Componente Auxiliar para as Caixas Coloridas (reduz repetição)
interface InfoBoxProps {
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
    variant: "warning" | "danger" | "success";
}

function InfoBox({ icon: Icon, title, children, variant }: InfoBoxProps) {
    // Configuração centralizada de cores
    const styles = {
        warning: {
            container: "bg-amber-50 border-amber-200 dark:bg-muted/50 dark:border-border", // Ajustei para combinar com seu original
            text: "text-amber-600 dark:text-amber-400",
            iconColor: "text-amber-600 dark:text-amber-400"
        },
        danger: {
            container: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50",
            text: "text-red-800 dark:text-red-200/80",
            iconColor: "text-red-600 dark:text-red-400"
        },
        success: {
            container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50",
            text: "text-emerald-800 dark:text-emerald-200",
            iconColor: "text-emerald-600 dark:text-emerald-400"
        }
    };

    const style = styles[variant];

    return (
        <div className={cn("p-3 rounded border", style.container)}>
            <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={style.iconColor} />
                <span className={cn("text-xs font-mono font-bold uppercase", style.iconColor)}>
                    {title}
                </span>
            </div>
            <div className={cn("text-sm", style.text)}>
                {children}
            </div>
        </div>
    );
}

// 2. Componente Principal Refatorado
export function TechnicalPanel({ focusedField, onClose }: TechnicalPanelProps) {
    const data = FIELD_METADATA[focusedField || "default"] || FIELD_METADATA["default"];

    return (
        <div className="h-fit sticky top-6 space-y-4">

            <div className="bg-card text-card-foreground rounded-lg p-5 shadow-lg border border-border transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                        <Info className="text-blue-600 dark:text-blue-400" size={20} />
                        <h3 className="font-bold text-lg tracking-wide">Raio-X Técnico</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full" aria-label="Fechar painel">
                        <X size={16} />
                    </Button>
                </div>

                {/* Conteúdo Dinâmico */}
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" key={focusedField}>

                    {/* Título do Campo */}
                    <div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold">
                            Campo Selecionado
                        </span>
                        <h4 className="text-xl font-semibold text-primary leading-tight mt-1">
                            {data.label}
                        </h4>
                    </div>

                    {/* Box 1: XML */}
                    <InfoBox icon={FileCode} title="XML / DANFE" variant="warning">
                        <code className="font-mono text-foreground break-all bg-background/50 px-1 py-0.5 rounded">
                            {data.xmlTag}
                        </code>
                    </InfoBox>

                    {/* Descrição */}
                    <div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {data.description}
                        </p>
                    </div>

                    {/* Box 2: Impacto */}
                    <InfoBox icon={AlertTriangle} title="Impacto e Validação" variant="danger">
                        {data.impact}
                    </InfoBox>

                    {/* Box 3: SPED (Condicional) */}
                    {data.sped && (
                        <InfoBox icon={Database} title="SPED" variant="success">
                            <strong>Registro:</strong> {data.sped}
                        </InfoBox>
                    )}
                </div>
            </div>
        </div>
    );
}