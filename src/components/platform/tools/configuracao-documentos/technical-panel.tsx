import { Info, FileCode, Database, AlertTriangle } from "lucide-react";
import { FIELD_METADATA } from "@/core/constants/field-metadata";

interface TechnicalPanelProps {
    focusedField: string | null;
}

export function TechnicalPanel({ focusedField }: TechnicalPanelProps) {
    // Se não tiver campo focado ou o campo não existir nos metadados, usa o default
    const data = FIELD_METADATA[focusedField || "default"] || FIELD_METADATA["default"];

    return (
        <div className="bg-slate-900 text-white rounded-lg p-5 shadow-xl border border-slate-700 sticky top-6 h-fit transition-all duration-300">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
                <Info className="text-blue-400" size={20} />
                <h3 className="font-bold text-lg tracking-wide">Raio-X Técnico</h3>
            </div>

            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" key={focusedField}> {/* Key força animação ao trocar */}

                <div>
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Campo</span>
                    <h4 className="text-xl font-semibold text-blue-200">{data.label}</h4>
                </div>

                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <FileCode size={14} className="text-yellow-500" />
                        <span className="text-xs font-mono text-yellow-500 font-bold">XML / DANFE</span>
                    </div>
                    <code className="text-sm font-mono text-slate-300 break-all">{data.xmlTag}</code>
                </div>

                <div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {data.description}
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1 bg-red-950/30 p-3 rounded border border-red-900/50">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-red-400" />
                            <span className="text-xs font-bold text-red-400">Impacto</span>
                        </div>
                        <p className="text-xs text-red-100/80 leading-tight">
                            {data.impact}
                        </p>
                    </div>
                </div>

                {data.sped && (
                    <div className="bg-green-950/30 p-2 rounded border border-green-900/50 flex items-center gap-2">
                        <Database size={14} className="text-green-400" />
                        <span className="text-xs text-green-100">
                            <strong>SPED:</strong> {data.sped}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}