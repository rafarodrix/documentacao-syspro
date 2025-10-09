'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';
import { FileUpload } from './FileUpload';
import { StatusDisplay } from './StatusDisplay';
import { ResultDisplay } from './ResultDisplay';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // ??? LÓGICA DE POLLING IMPLEMENTADA AQUI ???
  useEffect(() => {
    if (status !== 'processing' || !jobId) return;

    const intervalId = setInterval(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error("URL da API não configurada.");
        
        const response = await fetch(`${apiUrl}/api/status/${jobId}`);
        if (!response.ok) throw new Error("Falha ao buscar status.");
        
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
        setStatusMessage('Erro de rede ao verificar o status do processo.');
        clearInterval(intervalId);
      }
    }, 3000); // Pesquisa a cada 3 segundos

    return () => clearInterval(intervalId); // Limpeza ao sair da página
  }, [status, jobId]);
  // ??? FIM DA LÓGICA DE POLLING ???


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('idle');
    setResult(null);
    setStatusMessage('');
    setFiles(e.target.files);
  };
  
  const handleClearFiles = () => {
    setFiles(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // ??? LÓGICA DO SUBMIT IMPLEMENTADA AQUI ???
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // 1. Impede o recarregamento da página
    e.preventDefault(); 
    if (!files || files.length === 0) return;

    // 2. Define o estado inicial de carregamento
    setStatus('uploading');
    setStatusMessage('Enviando arquivos...');
    setResult(null);
    setUploadProgress(0);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('numerosParaCopiar', numeros);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("URL da API não configurada.");

      // 3. Envia os arquivos para o backend com Axios para obter o progresso
      const response = await axios.post(`${apiUrl}/api/analyze`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      // 4. Inicia o processo de polling (verificação de status)
      setJobId(response.data.jobId);
      setStatus('processing');
      setStatusMessage('Arquivos recebidos. Iniciando análise, por favor aguarde...');

    } catch (err: any) {
      // 5. Captura e exibe qualquer erro que ocorrer
      setStatus('error');
      if (err.response) {
        setStatusMessage(err.response.data.error || 'Erro no servidor.');
      } else if (err.request) {
        setStatusMessage('Erro de Conexão: O servidor não respondeu. Verifique se o backend está rodando.');
      } else {
        setStatusMessage(err.message);
      }
    }
  };
  // ??? FIM DA LÓGICA DO SUBMIT ???
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <main className="container mx-auto flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Analisador de XML Fiscal
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Uma ferramenta rápida para validar sequências e extrair documentos.
          </p>
        </div>

        <FileUpload
          files={files}
          numeros={numeros}
          status={status}
          onFileChange={handleFileChange}
          onNumerosChange={(e) => setNumeros(e.target.value)}
          onSubmit={handleSubmit}
          onClear={handleClearFiles}
        />
        
        <StatusDisplay
          status={status}
          statusMessage={statusMessage}
          uploadProgress={uploadProgress}
        />

        {status === 'completed' && result && (
          <ResultDisplay
            summary={result.summary}
            downloadUrl={result.downloadUrl}
            apiUrl={apiUrl}
          />
        )}
      </div>
    </main>
  );
}