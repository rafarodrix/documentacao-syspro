'use client';

import { useState } from 'react';
import { Download, CheckCircle, Copy, Check, FileText } from 'lucide-react';

type ResultDisplayProps = {
    summary: string;
    downloadUrl: string;
    apiUrl?: string;
}

export function ResultDisplay({ summary, downloadUrl, apiUrl }: ResultDisplayProps) {
    // 1. Correção: Só não renderiza se NÃO tiver nem resumo E nem download
    if (!summary && !downloadUrl) return null;

    const [copied, setCopied] = useState(false);

    const safeApiUrl = apiUrl?.replace(/\/+$/, '') || '';
    const safeDownloadUrl = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
    const fullUrl = safeApiUrl + safeDownloadUrl;

    // 2. Funcionalidade de Copiar Texto
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reseta após 2s
        } catch (err) {
            console.error('Falha ao copiar:', err);
        }
    };

    return (
        <div className="mt-10 bg-card rounded-xl shadow-lg border border-border animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

            {/* Cabeçalho de Sucesso */}
            <div className="bg-green-500/10 border-b border-green-500/20 p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Análise Concluída com Sucesso</h2>
                    <p className="text-sm text-muted-foreground">Seus arquivos foram processados e estão prontos.</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 3. Área de Download (Destaque Principal) */}
                {downloadUrl && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/50 p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-md">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">Pacote de XMLs Processados</p>
                                <p className="text-xs text-muted-foreground">Arquivo .zip pronto para download</p>
                            </div>
                        </div>
                        <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 px-6 rounded-md hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                        >
                            <Download size={18} />
                            Baixar Arquivos
                        </a>
                    </div>
                )}

                {/* 4. Área de Log / Resumo (Estilo Terminal) */}
                {summary && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                Resumo da Operação
                            </h3>
                            <button
                                onClick={handleCopy}
                                className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                title="Copiar resumo"
                            >
                                {copied ? (
                                    <>
                                        <Check size={14} className="text-green-500" />
                                        <span className="text-green-500 font-medium">Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        <span>Copiar Texto</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="relative group">
                            <div className="max-h-80 overflow-auto rounded-lg border border-border bg-zinc-950 dark:bg-black p-4 shadow-inner">
                                <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                                    <code>{summary}</code>
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}