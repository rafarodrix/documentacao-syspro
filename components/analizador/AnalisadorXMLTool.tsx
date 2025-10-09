'use client'; 

import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { FileUpload } from './FileUpload';
import { StatusDisplay } from './StatusDisplay';
import { ResultDisplay } from './ResultDisplay';

type Status = 'idle' | 'processing' | 'completed' | 'error';
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
  const [result, setResult] = useState<Result | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('idle');
    setResult(null);
    setStatusMessage('');
    setFiles(e.target.files);
  };
  
  const handleClearFiles = () => { /* ... */ };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setStatus('processing'); // Muda direto para 'processing'
    setStatusMessage('Enviando e analisando arquivos...');
    setResult(null);
    setUploadProgress(0);

    const formData = new FormData();
    const isZipUpload = files.length === 1 && files[0].name.endsWith('.zip');
    if (isZipUpload) {
      formData.append('file', files[0]);
    } else {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }
    formData.append('numerosParaCopiar', numeros);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("URL da API não configurada.");

      // Faz a chamada e ESPERA a resposta completa
      const response = await axios.post(`${apiUrl}/api/analyze`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
          if (percentCompleted < 100) {
            setStatusMessage('Enviando arquivos...');
          } else {
            setStatusMessage('Arquivos enviados. Aguardando análise do servidor...');
          }
        },
      });

      // Se chegamos aqui, a análise terminou com sucesso
      setResult(response.data);
      setStatus('completed');

    } catch (err: any) {
      setStatus('error');
      if (err.response) {
        setStatusMessage(err.response.data.error || 'Erro no servidor.');
      } else if (err.request) {
        setStatusMessage('Erro de Conexão: O servidor não respondeu.');
      } else {
        setStatusMessage(err.message);
      }
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