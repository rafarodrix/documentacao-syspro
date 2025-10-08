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

  // Efeito para pesquisar o status do processo (polling)
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
      } catch (err) {
        setStatus('error');
        setStatusMessage('Erro ao verificar o status do processo.');
        clearInterval(intervalId);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [status, jobId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('idle');
    setResult(null);
    setStatusMessage('');
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setStatus('error');
      setStatusMessage('Por favor, selecione uma pasta com arquivos XML.');
      return;
    }

    setStatus('uploading');
    setStatusMessage('Enviando arquivos...');
    setResult(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    formData.append('numerosParaCopiar', numeros);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("URL da API não configurada.");

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
        {/* ??? ESTA PARTE ESTAVA FALTANDO NO SEU CÓDIGO ??? */}
        <form onSubmit={handleSubmit}>
           <div className="mb-6">
            <label htmlFor="file-upload" className="block text-lg font-medium text-foreground mb-2">
              1. Selecione a Pasta de XMLs
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              // @ts-ignore
              webkitdirectory="true"
              directory="true"
              multiple
            />
            {files && <p className="text-sm text-muted-foreground mt-2">{files.length} arquivos selecionados.</p>}
          </div>

          <div className="mb-6">
            <label htmlFor="numeros" className="block text-lg font-medium text-foreground mb-2">
              2. Números para Copiar (separados por vírgula)
            </label>
            <input
              id="numeros"
              type="text"
              value={numeros}
              onChange={(e) => setNumeros(e.target.value)}
              placeholder="Ex: 150, 205, 301"
              className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'uploading' || status === 'processing'}
            className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-muted"
          >
            { (status === 'uploading' || status === 'processing') ? 'Analisando...' : 'Iniciar Análise'}
          </button>
        </form>
        {/* ??? FIM DA PARTE QUE ESTAVA FALTANDO ??? */}
      </div>

      {/* Área de Status e Resultados */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="mt-8 text-center p-4 bg-card border rounded-lg">
          <div className="flex items-center justify-center">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
             <p className="text-lg font-medium text-muted-foreground">{statusMessage}</p>
          </div>
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