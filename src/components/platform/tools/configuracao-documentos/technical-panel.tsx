import { Info, FileCode, Database, AlertTriangle, X } from "lucide-react";
import { FIELD_METADATA } from "@/core/constants/field-metadata";
import { Button } from "@/components/ui/button";

interface TechnicalPanelProps {
    focusedField: string | null;
    onClose: () => void; // Adicionamos a função de fechar
}

export function TechnicalPanel({ focusedField, onClose }: TechnicalPanelProps) {
    const data = FIELD_METADATA[focusedField || "default"] || FIELD_METADATA["default"];

    return (
        <div className="h-fit sticky top-6 space-y-4">

            {/* Cartão Principal */}
            <div className="bg-card text-card-foreground rounded-lg p-5 shadow border border-border transition-all duration-300">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                        <Info className="text-blue-600 dark:text-blue-400" size={20} />
                        <h3 className="font-bold text-lg tracking-wide">Raio-X Técnico</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X size={16} />
                    </Button>
                </div>

                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" key={focusedField}>

                    <div>
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Campo Selecionado</span>
                        <h4 className="text-xl font-semibold text-primary">{data.label}</h4>
                    </div>

                    {/* Box XML */}
                    <div className="bg-muted/50 p-3 rounded border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <FileCode size={14} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">XML / DANFE</span>
                        </div>
                        <code className="text-sm font-mono text-foreground break-all">{data.xmlTag}</code>
                    </div>

                    {/* Descrição */}
                    <div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {data.description}
                        </p>
                    </div>

                    {/* Impacto (Alerta) */}
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-200 dark:border-red-900/50">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">Impacto e Validação</span>
                        </div>
                        <p className="text-xs text-red-800 dark:text-red-200/80 leading-tight">
                            {data.impact}
                        </p>
                    </div>

                    {/* SPED */}
                    {data.sped && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                            <Database size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs text-emerald-800 dark:text-emerald-200">
                                <strong>SPED:</strong> {data.sped}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}