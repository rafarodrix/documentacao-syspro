'use client'; 

import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { FileUpload } from './FileUpload';
import { StatusDisplay } from './StatusDisplay';
import { ResultDisplay } from './ResultDisplay'; // Você precisará criar este componente se quiser mostrar o resumo

// Tipos para clareza
type Status = 'idle' | 'processing' | 'completed' | 'error';

export function AnalisadorXMLTool() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [numeros, setNumeros] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('idle');
    setStatusMessage('');
    setFiles(e.target.files);
  };
  
  const handleClearFiles = () => {
    setFiles(null);
    const fileInputFolder = document.getElementById('folder-upload') as HTMLInputElement;
    const fileInputZip = document.getElementById('zip-upload') as HTMLInputElement;
    if (fileInputFolder) fileInputFolder.value = "";
    if (fileInputZip) fileInputZip.value = "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setStatus('error');
      setStatusMessage('Por favor, selecione arquivos ou uma pasta.');
      return;
    }

    setStatus('processing');
    setStatusMessage('Enviando arquivos...');
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
        responseType: 'blob', // Espera um arquivo (blob) como resposta
      });

      // Se chegamos aqui, a resposta foi um sucesso (status 200) e contém o arquivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'resultados.zip'; // Nome padrão
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length > 1) {
              filename = filenameMatch[1];
          }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setStatus('completed');
      setStatusMessage('Análise concluída! O download foi iniciado.');

    } catch (err: any) {
      setStatus('error');
      // Se o erro tiver uma resposta (ex: 400 ou 500), o backend enviou um erro em JSON
      if (err.response && err.response.data.type === 'application/json') {
          // Precisamos ler o Blob de erro como texto
          const errorJson = await (err.response.data as Blob).text();
          const errorObj = JSON.parse(errorJson);
          setStatusMessage(errorObj.error || 'Ocorreu um erro no servidor.');
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

        {status === 'completed' && (
           <div className="mt-10 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md animate-fade-in" role="alert">
                <p className="font-bold">Sucesso!</p>
                <p>{statusMessage}</p>
           </div>
        )}
      </div>
    </main>
  );
}