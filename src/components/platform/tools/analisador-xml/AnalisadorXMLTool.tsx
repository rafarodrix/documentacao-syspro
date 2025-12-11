'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

import { FileUpload } from './FileUpload';
import { StatusDisplay } from './StatusDisplay';
import { ResultDisplay } from './ResultDisplay';

// Tipos para clareza
type Status = 'idle' | 'processing' | 'completed' | 'error';

// ✅ Novo tipo para o evento de arquivo, compatível com Drag & Drop
type FileChangeEvent = ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } };

export function AnalisadorXMLTool() {
  // --- ESTADO DO FORMULÁRIO ---
  const [files, setFiles] = useState<FileList | null>(null);
  const [numeros, setNumeros] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // --- ESTADO DA API/PROCESSO ---
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- ESTADO DO RESULTADO ---
  const [summary, setSummary] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  // ✅ CORREÇÃO AQUI: Atualizada a tipagem do evento 'e'
  const handleFileChange = (e: FileChangeEvent) => {
    setStatus('idle');
    setStatusMessage('');
    // O TypeScript agora aceita isso porque ambos os tipos possuem .target.files
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
      if (!apiUrl) throw new Error("URL da API não configurada.");

      const response = await axios.post(`${apiUrl}/api/analyze`, formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percentCompleted);
          if (percentCompleted < 100) {
            setStatusMessage('Enviando arquivos...');
          } else {
            setStatusMessage('Arquivos enviados. Aguardando análise do servidor...');
          }
        },
      });

      setSummary(response.data.summary);
      setDownloadUrl(response.data.downloadUrl);
      setStatus('completed');
      setStatusMessage('Análise concluída!');

    } catch (err: any) {
      setStatus('error');
      if (err.response && err.response.data && err.response.data.error) {
        setStatusMessage(err.response.data.error);
      } else if (err.request) {
        setStatusMessage('Erro de Conexão: O servidor não respondeu. Verifique se o backend está rodando.');
      } else {
        setStatusMessage(err.message);
      }
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
          onFileChange={handleFileChange} // ✅ Agora compatível
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