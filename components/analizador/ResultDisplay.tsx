import { Download, CheckCircle } from 'lucide-react';

type ResultDisplayProps = {
    summary: string;
    downloadUrl: string;
    apiUrl?: string;
}

export function ResultDisplay({ summary, downloadUrl, apiUrl }: ResultDisplayProps) {
    if (!summary) return null;

    const safeApiUrl = apiUrl?.replace(/\/+$/, '') || '';
    const safeDownloadUrl = downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`;
    const fullUrl = safeApiUrl + safeDownloadUrl;

    return (
        <div className="mt-10 bg-card p-6 rounded-lg shadow-md border animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-foreground">Resultados da Análise</h2>
                <CheckCircle className="h-8 w-8 text-green-500" />
            </div>

            <a
                href={fullUrl}
                className="inline-flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 mb-4 text-lg transition-colors"
                target="_blank"
                rel="noopener noreferrer"
            >
                <Download size={20} />
                Baixar Resultados (.zip)
            </a>

            <div className="max-h-72 overflow-auto rounded-md border bg-secondary p-4 text-secondary-foreground text-sm">
                <pre className="whitespace-pre-wrap break-all">
                    <code>{summary}</code>
                </pre>
            </div>
        </div>
    );
}
