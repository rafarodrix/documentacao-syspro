'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

import { FileUpload } from './file-upload';
import { StatusDisplay } from './status-display';
import { ResultDisplay } from './result-display';

type Status = 'idle' | 'processing' | 'completed' | 'error';
type FileChangeEvent = ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } };
type AnalyzeApiResponse = {
  summary: string;
  downloadUrl: string;
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data?.error === "string") return error.response.data.error;
    if (error.request) return "Erro de conexao: o servidor nao respondeu. Verifique se o backend esta rodando.";
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return "Falha inesperada ao processar os arquivos.";
}

export function AnalisadorXMLTool() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [numeros, setNumeros] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [summary, setSummary] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e: FileChangeEvent) => {
    setStatus('idle');
    setStatusMessage('');
    setFiles(e.target.files);
  };

  const handleClearFiles = () => {
    setFiles(null);
    setStatus('idle');
    setStatusMessage('');
    setFileInputKey(Date.now());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setStatus('error');
      setStatusMessage('Por favor, selecione arquivos ou uma pasta.');
      return;
    }

    if (!cnpjEmpresa) {
      setStatus('error');
      setStatusMessage('Por favor, digite o CNPJ da sua empresa.');
      return;
    }

    setStatus('processing');
    setStatusMessage('Enviando arquivos...');
    setUploadProgress(0);
    setSummary('');
    setDownloadUrl('');

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
    formData.append('cnpjEmpresa', cnpjEmpresa);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("URL da API nao configurada.");

      const response = await axios.post<AnalyzeApiResponse>(`${apiUrl}/api/analyze`, formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percentCompleted);
          if (percentCompleted < 100) {
            setStatusMessage('Enviando arquivos...');
          } else {
            setStatusMessage('Arquivos enviados. Aguardando analise do servidor...');
          }
        },
      });

      setSummary(response.data.summary);
      setDownloadUrl(response.data.downloadUrl);
      setStatus('completed');
      setStatusMessage('Análise concluída!');
    } catch (err: unknown) {
      setStatus('error');
      setStatusMessage(getErrorMessage(err));
    }
  };

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
          fileInputKey={fileInputKey}
          files={files}
          numeros={numeros}
          cnpjEmpresa={cnpjEmpresa}
          status={status}
          onFileChange={handleFileChange}
          onNumerosChange={(e) => setNumeros(e.target.value)}
          onCnpjChange={(e) => setCnpjEmpresa(e.target.value)}
          onSubmit={handleSubmit}
          onClear={handleClearFiles}
        />

        <StatusDisplay
          status={status}
          statusMessage={statusMessage}
          uploadProgress={uploadProgress}
        />

        {status === 'completed' && (
          <ResultDisplay
            summary={summary}
            downloadUrl={downloadUrl}
            apiUrl={process.env.NEXT_PUBLIC_API_URL}
          />
        )}
      </div>
    </main>
  );
}
