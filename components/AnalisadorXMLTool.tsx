'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';

// Tipos para clareza
type Status = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
interface Result {
  summary: string;
  downloadUrl: string;
}

export function AnalisadorXMLTool() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [numeros, setNumeros] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Efeito para pesquisar o status do processo
  useEffect(() => {
    if (status !== 'processing' || !jobId) return;

    const intervalId = setInterval(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}/api/status/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setStatus('completed');
          setStatusMessage('Análise concluída com sucesso!');
          setResult({ summary: data.summary, downloadUrl: data.downloadUrl });
          clearInterval(intervalId);
        } else if (data.status === 'error') {
          setStatus('error');
          setStatusMessage(`Erro durante a análise: ${data.error}`);
          clearInterval(intervalId);
        }
        // Se ainda estiver 'processing', continua...
      } catch (err) {
        setStatus('error');
        setStatusMessage('Erro ao verificar o status do processo.');
        clearInterval(intervalId);
      }
    }, 3000); // Pesquisa a cada 3 segundos

    // Limpeza ao sair da página
    return () => clearInterval(intervalId);
  }, [status, jobId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files) return;

    setStatus('uploading');
    setStatusMessage('Enviando arquivos...');
    setResult(null);

    const formData = new FormData();
    // ... (código para adicionar arquivos e números ao formData)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/analyze`, { method: 'POST', body: formData });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro no envio.');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('processing');
      setStatusMessage('Arquivos recebidos. Iniciando análise, por favor aguarde...');

    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message);
    }
  };
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <div className="max-w-2xl">
      <div className="bg-card p-6 rounded-lg shadow-md border">
        {/* ... (O formulário HTML/JSX permanece o mesmo da versão anterior) ... */}
      </div>

      {/* NOVO: Área de Status e Resultados */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-lg font-medium text-muted-foreground mt-4">{statusMessage}</p>
        </div>
      )}

      {status === 'error' && (
         <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
           <strong className="font-bold">Ocorreu um Erro: </strong>
           <span className="block sm:inline">{statusMessage}</span>
         </div>
      )}

      {status === 'completed' && result && (
        <div className="mt-10 bg-card p-6 rounded-lg shadow-md border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Resultados da Análise</h2>
          <a
            href={`${apiUrl}${result.downloadUrl}`}
            className="inline-block bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 mb-6 text-lg"
          >
            Baixar Resultados (.zip)
          </a>
          <pre className="bg-secondary text-secondary-foreground p-4 rounded-md overflow-x-auto text-sm">
            <code>{result.summary}</code>
          </pre>
        </div>
      )}
    </div>
  );
}