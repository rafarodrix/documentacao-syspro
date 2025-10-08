'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios'; // Usando axios para o progresso do upload
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

  useEffect(() => { /* ... Lógica de polling (sem alterações) ... */ }, [status, jobId]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('idle');
    setResult(null);
    setStatusMessage('');
    setFiles(e.target.files);
  };
  
  const handleClearFiles = () => {
    setFiles(null);
    // Limpa o valor do input para permitir selecionar a mesma pasta de novo
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

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

      // Usando Axios para obter o progresso do upload
      const response = await axios.post(`${apiUrl}/api/analyze`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      setJobId(response.data.jobId);
      setStatus('processing');
      setStatusMessage('Arquivos recebidos. Iniciando análise, por favor aguarde...');

    } catch (err: any) {
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
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <div className="max-w-2xl">
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
  );
}