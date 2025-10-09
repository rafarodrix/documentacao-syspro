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

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setStatus('uploading');
    setStatusMessage('Enviando arquivos...');

    const formData = new FormData();
    
    const isZipUpload = files.length === 1 && files[0].name.endsWith('.zip');

    if (isZipUpload) {
      // Se for um ZIP, envia como um único arquivo 'file'
      formData.append('file', files[0]);
    } else {
      // Se for uma pasta, envia como múltiplos arquivos 'files'
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }

    
    formData.append('numerosParaCopiar', numeros);
    
    try {
    } catch (err: any) {
    }
  };
  
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