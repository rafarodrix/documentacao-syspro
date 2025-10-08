import { Download, CheckCircle } from 'lucide-react';

type ResultDisplayProps = {
    summary: string;
    downloadUrl: string;
    apiUrl: string | undefined;
}

export function ResultDisplay({ summary, downloadUrl, apiUrl }: ResultDisplayProps) {
    if (!summary) return null;

    return (
        <div className="mt-10 bg-card p-6 rounded-lg shadow-md border animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold text-foreground">Resultados da Análise</h2>
                 <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <a
                href={`${apiUrl}${downloadUrl}`}
                className="inline-flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 mb-6 text-lg transition-colors"
            >
                <Download size={20} />
                Baixar Resultados (.zip)
            </a>
            <pre className="bg-secondary text-secondary-foreground p-4 rounded-md overflow-x-auto text-sm">
                <code>{summary}</code>
            </pre>
        </div>
    );
}