import { ChangeEvent, FormEvent } from 'react';
import { UploadCloud, File, X, FileArchive, FolderUp } from 'lucide-react';

type FileUploadProps = {
  files: FileList | null;
  numeros: string;
  status: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNumerosChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function FileUpload({ files, numeros, status, onFileChange, onNumerosChange, onSubmit, onClear }: FileUploadProps) {
  const isProcessing = status === 'uploading' || status === 'processing';
  const isZip = files && files.length === 1 && files[0].name.endsWith('.zip');

  return (
    <div className="bg-card p-8 rounded-xl shadow-sm border">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-lg font-semibold text-foreground mb-4">
            1. Escolha o Método de Upload
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Botão para Pasta */}
            <label
              htmlFor="folder-upload"
              className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
            >
              <FolderUp className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="font-semibold text-primary">Carregar Pasta</span>
              <span className="text-xs text-muted-foreground mt-1">Selecione uma pasta com os XMLs</span>
              <input id="folder-upload" type="file" className="sr-only" onChange={onFileChange} multiple
                // @ts-ignore
                webkitdirectory="true" directory="true"
              />
            </label>
            {/* Botão para ZIP */}
            <label
              htmlFor="zip-upload"
              className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
            >
              <FileArchive className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="font-semibold text-primary">Carregar .zip</span>
               <span className="text-xs text-muted-foreground mt-1">Envie um único arquivo compactado</span>
              <input id="zip-upload" type="file" className="sr-only" onChange={onFileChange} accept=".zip" />
            </label>
          </div>
        </div>

        {files && files.length > 0 && (
          <div className="border-t border-b border-border py-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-foreground">Seleção Atual:</h3>
                <button type="button" onClick={onClear} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                    <X size={16} /> Limpar
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 truncate text-sm text-muted-foreground">
                {isZip ? <FileArchive size={16} /> : <FolderUp size={16} />}
                <span>
                  {isZip ? files[0].name : `${files.length} arquivos selecionados`}
                </span>
              </div>
          </div>
        )}

        <div>
          <label htmlFor="numeros" className="block text-lg font-semibold text-foreground mb-2">
            2. Números para Copiar (Opcional)
          </label>
          <input
            id="numeros"
            type="text"
            value={numeros}
            onChange={onNumerosChange}
            placeholder="Ex: 150, 205, 301"
            className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || !files || files.length === 0}
          className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Analisando...' : 'Iniciar Análise'}
        </button>
      </form>
    </div>
  );
}