"use client";

import { FileText, Paperclip, Upload, X } from "lucide-react";

import { Button, Label } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import { formatTicketAttachmentSize } from "./ticket-details.helpers";

interface TicketAttachmentFieldProps {
  files: File[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  accept?: string;
  compact?: boolean;
}

export function TicketAttachmentField({
  files,
  inputRef,
  onChange,
  onRemove,
  accept = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt",
  compact = false,
}: TicketAttachmentFieldProps) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">Anexos (Opcional)</Label>
          <p className="mt-1 text-xs text-muted-foreground">Use evidencias essenciais. Limite operacional de 5 MB por envio.</p>
        </div>
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} className="gap-2" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Anexo
        </Button>
      </div>

      <div
        className={cn(
          "rounded-xl border border-dashed border-border/70 bg-muted/20",
          compact ? "p-3" : "p-4",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
            <Paperclip className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {files.length ? `${files.length} arquivo(s) prontos para envio` : "Nenhum arquivo selecionado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {files.length ? `${formatTicketAttachmentSize(totalBytes)} em anexo` : "Imagens, PDF e documentos curtos."}
            </p>
          </div>
        </div>

        <input type="file" ref={inputRef} className="hidden" multiple accept={accept} onChange={onChange} />

        {files.length ? (
          <div className="mt-3 space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}:${file.size}:${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatTicketAttachmentSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
