'use client';

import { ChangeEvent, FormEvent, DragEvent, useState } from 'react';
import { X, FileArchive, FolderUp, UploadCloud } from 'lucide-react';

type FileUploadProps = {
  fileInputKey: string | number;
  files: FileList | null;
  numeros: string;
  cnpjEmpresa: string;
  status: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => void; // Atualizado para aceitar objeto simulado
  onNumerosChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCnpjChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function FileUpload({
  fileInputKey,
  files,
  numeros,
  cnpjEmpresa,
  status,
  onFileChange,
  onNumerosChange,
  onCnpjChange,
  onSubmit,
  onClear,
}: FileUploadProps) {
  const isProcessing = status === 'uploading' || status === 'processing';
  const isZip = files && files.length === 1 && files[0].name.endsWith('.zip');

  // Estado para efeito visual de "Arrastar por cima"
  const [isDragging, setIsDragging] = useState(false);

  // --- Lógica de Drag & Drop ---
  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>, type: 'folder' | 'zip') => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Pequena validação para garantir que ZIP seja único se for a opção ZIP
      if (type === 'zip' && !e.dataTransfer.files[0].name.endsWith('.zip')) {
        alert('Por favor, arraste um arquivo .zip'); // Idealmente usar um Toast aqui
        return;
      }

      // Simula o evento que o input file geraria
      onFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  // --- Lógica de Máscara de CNPJ ---
  const handleCnpjChangeLocal = (e: ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito
    let value = e.target.value.replace(/\D/g, '');

    // Limita a 14 dígitos
    if (value.length > 14) value = value.slice(0, 14);

    // Atualiza o valor no input (hack simples para manter o cursor ok em edições simples)
    e.target.value = value;

    onCnpjChange(e);
  };

  // Classes dinâmicas para o Drag & Drop
  const dropZoneClasses = `
    flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed 
    text-center cursor-pointer transition-colors duration-200
    ${isDragging
      ? 'border-primary bg-primary/10 scale-[1.02]'
      : 'border-border hover:border-primary hover:bg-secondary'
    }
  `;

  return (
    <div className="bg-card p-8 rounded-xl shadow-sm border">
      <form onSubmit={onSubmit} className="space-y-6">

        {/* SEÇÃO 1: UPLOAD */}
        <div>
          <label className="block text-lg font-semibold text-foreground mb-4">
            1. Escolha ou Arraste os Arquivos
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Botão Pasta (Drop Zone) */}
            <label
              htmlFor="folder-upload"
              className={dropZoneClasses}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'folder')}
            >
              <FolderUp className={`h-10 w-10 mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-semibold text-primary">Carregar Pasta</span>
              <span className="text-xs text-muted-foreground mt-1">
                Clique ou arraste arquivos XML aqui
              </span>
              <input
                key={`folder-${fileInputKey}`}
                id="folder-upload"
                type="file"
                className="sr-only"
                onChange={onFileChange}
                multiple
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
              />
            </label>

            {/* Botão ZIP (Drop Zone) */}
            <label
              htmlFor="zip-upload"
              className={dropZoneClasses}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'zip')}
            >
              <FileArchive className={`h-10 w-10 mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-semibold text-primary">Carregar .zip</span>
              <span className="text-xs text-muted-foreground mt-1">
                Clique ou arraste um arquivo .zip
              </span>
              <input
                key={`zip-${fileInputKey}`}
                id="zip-upload"
                type="file"
                className="sr-only"
                onChange={onFileChange}
                accept=".zip"
              />
            </label>
          </div>
        </div>

        {/* FEEDBACK DE SELEÇÃO */}
        {files && files.length > 0 && (
          <div className="border-t border-b border-border py-4 animate-fade-in bg-secondary/30 px-4 rounded-md">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <UploadCloud size={16} className="text-primary" />
                Arquivos Prontos para Análise:
              </h3>
              <button
                type="button"
                onClick={onClear}
                className="text-sm font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <X size={16} /> Remover
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 truncate text-sm text-muted-foreground">
              {isZip ? <FileArchive size={16} /> : <FolderUp size={16} />}
              <span className="font-mono bg-background px-2 py-0.5 rounded border">
                {isZip ? files[0].name : `${files.length} arquivos detectados`}
              </span>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: CNPJ */}
        <div>
          <label htmlFor="cnpj" className="block text-lg font-semibold text-foreground mb-2">
            2. CNPJ da Empresa
          </label>
          <div className="relative">
            <input
              id="cnpj"
              type="text"
              value={cnpjEmpresa}
              onChange={handleCnpjChangeLocal} // Usa o handler local com máscara
              maxLength={14}
              placeholder="00000000000191"
              required
              className={`
                mt-1 block w-full px-4 py-3 bg-background border rounded-md shadow-sm 
                placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all
                ${cnpjEmpresa && cnpjEmpresa.length < 14 ? 'border-red-300 focus:ring-red-200' : 'border-border'}
              `}
            />
            {/* Feedback visual de tamanho */}
            <div className="absolute right-3 top-4 text-xs text-muted-foreground">
              {cnpjEmpresa.length}/14
            </div>
          </div>
          {cnpjEmpresa && cnpjEmpresa.length < 14 && (
            <p className="text-xs text-red-500 mt-1">O CNPJ deve conter 14 dígitos.</p>
          )}
        </div>

        {/* SEÇÃO 3: NÚMEROS */}
        <div>
          <label htmlFor="numeros" className="block text-lg font-semibold text-foreground mb-2">
            3. Filtro de Numeração (Opcional)
          </label>
          <input
            id="numeros"
            type="text"
            value={numeros}
            onChange={onNumerosChange}
            placeholder="Ex: 150, 205, 301-310"
            className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        <button
          type="submit"
          // Bloqueia se CNPJ for inválido (menor que 14)
          disabled={isProcessing || !files || files.length === 0 || cnpjEmpresa.length < 14}
          className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.99]"
        >
          {isProcessing ? 'Processando Arquivos...' : 'Iniciar Análise Fiscal'}
        </button>
      </form>
    </div>
  );
}