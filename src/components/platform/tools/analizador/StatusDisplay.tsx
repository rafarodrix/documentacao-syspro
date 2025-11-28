import { AlertTriangle, CheckCircle, Loader } from 'lucide-react';

type Status = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

type StatusDisplayProps = {
    status: Status;
    statusMessage: string;
    uploadProgress: number;
}

export function StatusDisplay({ status, statusMessage, uploadProgress }: StatusDisplayProps) {
    if (status === 'idle' || status === 'completed') return null;

    if (status === 'error') {
        return (
            <div className="mt-8 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                <div className="flex">
                    <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-500 mr-3" /></div>
                    <div>
                        <p className="font-bold">Ocorreu um Erro</p>
                        <p className="text-sm">{statusMessage}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Status de Uploading ou Processing
    return (
        <div className="mt-8 p-4 bg-card border rounded-lg">
            <div className="flex items-center justify-center mb-4">
                <Loader className="animate-spin h-8 w-8 text-primary mr-3" />
                <p className="text-lg font-medium text-muted-foreground">{statusMessage}</p>
            </div>
            {status === 'uploading' && (
                <div>
                    <div className="w-full bg-secondary rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
                </div>
            )}
        </div>
    );
}