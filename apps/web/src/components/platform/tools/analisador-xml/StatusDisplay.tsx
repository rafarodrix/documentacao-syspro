import { AlertTriangle, Loader, FileCheck, ServerCog } from 'lucide-react';

type Status = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

type StatusDisplayProps = {
    status: Status;
    statusMessage: string;
    uploadProgress: number;
}

export function StatusDisplay({ status, statusMessage, uploadProgress }: StatusDisplayProps) {
    if (status === 'idle' || status === 'completed') return null;

    // Lógica para determinar ícone e estado visual
    const isProcessing = status === 'processing';

    // Tratamento de Erro (Melhorado para Dark Mode)
    if (status === 'error') {
        return (
            <div className="mt-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-md animate-in slide-in-from-bottom-2 fade-in duration-300" role="alert">
                <div className="flex">
                    <div className="py-1">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                    </div>
                    <div>
                        <p className="font-bold">Ocorreu um Erro</p>
                        <p className="text-sm mt-1 opacity-90">{statusMessage}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Status de Loading (Upload ou Processamento)
    return (
        <div className="mt-8 p-6 bg-card border rounded-lg shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col items-center justify-center mb-6 text-center space-y-3">
                {/* Ícone dinâmico: Nuvem subindo ou Servidor processando */}
                <div className="relative">
                    {isProcessing ? (
                        <ServerCog className="h-10 w-10 text-primary animate-pulse" />
                    ) : (
                        <Loader className="h-10 w-10 text-primary animate-spin" />
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-lg font-medium text-foreground">
                        {statusMessage}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {isProcessing
                            ? "Isso pode levar alguns segundos dependendo do tamanho dos arquivos."
                            : "Não feche a página enquanto enviamos seus arquivos."}
                    </p>
                </div>
            </div>

            {/* Barra de Progresso Acessível */}
            <div
                className="w-full bg-secondary rounded-full h-3 overflow-hidden"
                role="progressbar"
                aria-valuenow={isProcessing ? 100 : uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end
                        ${isProcessing ? 'bg-primary/70 animate-pulse w-full' : 'bg-primary'}
                    `}
                    style={{
                        width: isProcessing ? '100%' : `${uploadProgress}%`
                    }}
                >
                    {/* Brilho animado (opcional, apenas visual) */}
                    {!isProcessing && (
                        <div className="h-full w-2 bg-white/30 rounded-full mr-1 animate-pulse" />
                    )}
                </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
                <span>{isProcessing ? 'Upload Completo' : 'Enviando...'}</span>
                <span>{isProcessing ? '100%' : `${uploadProgress}%`}</span>
            </div>
        </div>
    );
}