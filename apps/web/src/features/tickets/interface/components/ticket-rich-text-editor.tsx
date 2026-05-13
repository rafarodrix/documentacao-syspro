"use client";

import { useRef, type ClipboardEvent as ReactClipboardEvent, type ComponentProps, type MouseEvent } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
} from "lucide-react";

import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Textarea, Tooltip, TooltipContent, TooltipTrigger } from "@dosc-syspro/ui";
import { markdownToPlainText, normalizeTicketMarkdownInput } from "@/features/tickets/lib/ticket-markdown";
import { cn } from "@/lib/utils";

type TicketRichTextEditorTemplate = {
  id: string;
  label: string;
  value: string;
};

type TicketRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (event: ReactClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  className?: string;
  minHeightClassName?: string;
  templates?: TicketRichTextEditorTemplate[];
  showTemplates?: boolean;
  compact?: boolean;
};

const DEFAULT_TEMPLATES: TicketRichTextEditorTemplate[] = [
  {
    id: "reproducao",
    label: "Passos para reproduzir",
    value: [
      "## Passos para reproduzir",
      "1. ",
      "2. ",
      "3. ",
      "",
      "### Resultado atual",
      "",
      "### Resultado esperado",
    ].join("\n"),
  },
  {
    id: "impacto",
    label: "Impacto e urgencia",
    value: [
      "## Impacto",
      "- Usuarios afetados:",
      "- Processo afetado:",
      "- Frequencia:",
      "",
      "### Urgencia operacional",
    ].join("\n"),
  },
  {
    id: "analise",
    label: "Contexto tecnico",
    value: [
      "## Contexto tecnico",
      "- Base/ambiente:",
      "- Modulo:",
      "- Versao:",
      "- Mensagem de erro:",
      "",
      "### Evidencias",
    ].join("\n"),
  },
];

export function TicketRichTextEditor({
  value,
  onChange,
  onPaste,
  placeholder,
  className,
  minHeightClassName = "min-h-80",
  templates = DEFAULT_TEMPLATES,
  showTemplates = true,
  compact = false,
}: TicketRichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function preserveSelection(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
  }

  function updateSelection(
    transform: (context: {
      currentValue: string;
      selectedValue: string;
      selectionStart: number;
      selectionEnd: number;
    }) => {
      nextValue: string;
      nextSelectionStart: number;
      nextSelectionEnd: number;
    },
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedValue = value.slice(selectionStart, selectionEnd);
    const result = transform({
      currentValue: value,
      selectedValue,
      selectionStart,
      selectionEnd,
    });

    onChange(result.nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.nextSelectionStart, result.nextSelectionEnd);
    });
  }

  function wrapSelection(prefix: string, suffix = prefix, placeholderText = "texto") {
    updateSelection(({ currentValue, selectedValue, selectionStart, selectionEnd }) => {
      const content = selectedValue || placeholderText;
      const replacement = `${prefix}${content}${suffix}`;
      const nextValue =
        currentValue.slice(0, selectionStart) +
        replacement +
        currentValue.slice(selectionEnd);
      const contentStart = selectionStart + prefix.length;
      const contentEnd = contentStart + content.length;

      return {
        nextValue,
        nextSelectionStart: contentStart,
        nextSelectionEnd: contentEnd,
      };
    });
  }

  function toggleLinePrefix(prefix: string, placeholderText: string) {
    updateSelection(({ currentValue, selectedValue, selectionStart, selectionEnd }) => {
      const selected = selectedValue || placeholderText;
      const lines = selected.split("\n");
      const shouldRemove = lines.every((line) => line.startsWith(prefix));
      const replacement = lines
        .map((line) => {
          if (shouldRemove) {
            return line.startsWith(prefix) ? line.slice(prefix.length) : line;
          }
          return line ? `${prefix}${line}` : prefix.trimEnd();
        })
        .join("\n");
      const nextValue =
        currentValue.slice(0, selectionStart) +
        replacement +
        currentValue.slice(selectionEnd);
      return {
        nextValue,
        nextSelectionStart: selectionStart,
        nextSelectionEnd: selectionStart + replacement.length,
      };
    });
  }

  function setHeading(level: 2 | 3) {
    const prefix = `${"#".repeat(level)} `;
    updateSelection(({ currentValue, selectedValue, selectionStart, selectionEnd }) => {
      const selected = selectedValue || "Titulo";
      const lines = selected.split("\n");
      const replacement = lines
        .map((line) => {
          const withoutHeading = line.replace(/^#{1,6}\s+/, "");
          return withoutHeading ? `${prefix}${withoutHeading}` : prefix.trimEnd();
        })
        .join("\n");
      const nextValue =
        currentValue.slice(0, selectionStart) +
        replacement +
        currentValue.slice(selectionEnd);
      return {
        nextValue,
        nextSelectionStart: selectionStart,
        nextSelectionEnd: selectionStart + replacement.length,
      };
    });
  }

  function clearFormatting() {
    updateSelection(({ currentValue, selectedValue, selectionStart, selectionEnd }) => {
      const source = selectedValue || currentValue;
      const cleaned = markdownToPlainText(source);

      if (selectedValue) {
        const nextValue =
          currentValue.slice(0, selectionStart) +
          cleaned +
          currentValue.slice(selectionEnd);
        return {
          nextValue,
          nextSelectionStart: selectionStart,
          nextSelectionEnd: selectionStart + cleaned.length,
        };
      }

      return {
        nextValue: cleaned,
        nextSelectionStart: cleaned.length,
        nextSelectionEnd: cleaned.length,
      };
    });
  }

  function insertCodeBlock() {
    updateSelection(({ currentValue, selectedValue, selectionStart, selectionEnd }) => {
      const content = selectedValue || "codigo";
      const replacement = `\`\`\`\n${content}\n\`\`\``;
      const nextValue =
        currentValue.slice(0, selectionStart) +
        replacement +
        currentValue.slice(selectionEnd);
      const contentStart = selectionStart + 4;
      const contentEnd = contentStart + content.length;
      return {
        nextValue,
        nextSelectionStart: contentStart,
        nextSelectionEnd: contentEnd,
      };
    });
  }

  function insertTemplate(templateValue: string) {
    updateSelection(({ currentValue, selectionStart, selectionEnd }) => {
      const trimmedCurrent = currentValue.trimEnd();
      const prefix = trimmedCurrent ? "\n\n" : "";
      const normalizedTemplate = normalizeTicketMarkdownInput(templateValue).trim();
      const replacement = `${prefix}${normalizedTemplate}`;
      const nextValue =
        currentValue.slice(0, selectionStart) +
        replacement +
        currentValue.slice(selectionEnd);
      const cursor = selectionStart + replacement.length;
      return {
        nextValue,
        nextSelectionStart: cursor,
        nextSelectionEnd: cursor,
      };
    });
  }

  function insertLink() {
    const url = window.prompt("Informe a URL do link", "https://");
    if (url === null) return;
    const normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    wrapSelection("[", `](${normalizedUrl})`, "link");
  }

  const toolbarButtonClassName =
    "h-8 rounded-md border border-transparent px-2.5 text-muted-foreground hover:text-foreground data-[active=true]:border-border/80 data-[active=true]:bg-background data-[active=true]:text-foreground";

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm", className)}>
      <div className={cn("flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-3 py-2", compact && "gap-1.5 px-2.5 py-2")}>
        <ToolbarButton
          label="Titulo"
          onMouseDown={preserveSelection}
          onClick={() => setHeading(2)}
          className={toolbarButtonClassName}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subtitulo"
          onMouseDown={preserveSelection}
          onClick={() => setHeading(3)}
          className={toolbarButtonClassName}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border/60" />
        <ToolbarButton
          label="Negrito"
          onMouseDown={preserveSelection}
          onClick={() => wrapSelection("**", "**")}
          className={toolbarButtonClassName}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italico"
          onMouseDown={preserveSelection}
          onClick={() => wrapSelection("_", "_")}
          className={toolbarButtonClassName}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          onMouseDown={preserveSelection}
          onClick={() => toggleLinePrefix("- ", "Item da lista")}
          className={toolbarButtonClassName}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          onMouseDown={preserveSelection}
          onClick={() => toggleLinePrefix("1. ", "Item numerado")}
          className={toolbarButtonClassName}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Citacao"
          onMouseDown={preserveSelection}
          onClick={() => toggleLinePrefix("> ", "Observacao importante")}
          className={toolbarButtonClassName}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Codigo inline"
          onMouseDown={preserveSelection}
          onClick={() => wrapSelection("`", "`", "codigo")}
          className={toolbarButtonClassName}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bloco de codigo"
          onMouseDown={preserveSelection}
          onClick={insertCodeBlock}
          className={toolbarButtonClassName}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          onMouseDown={preserveSelection}
          onClick={insertLink}
          className={toolbarButtonClassName}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Limpar formatacao"
          onMouseDown={preserveSelection}
          onClick={clearFormatting}
          className={toolbarButtonClassName}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-2">
          {showTemplates ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-border/60 text-xs"
                  onMouseDown={preserveSelection}
                >
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs">Blocos sugeridos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {templates.map((template) => (
                  <DropdownMenuItem key={template.id} className="text-xs" onClick={() => insertTemplate(template.value)}>
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {markdownToPlainText(value).length} caracteres
          </span>
        </div>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={onPaste}
        placeholder={placeholder}
        className={cn(
          "resize-y rounded-none border-0 px-4 py-3 font-mono text-sm leading-6 shadow-none focus-visible:ring-0",
          "bg-background text-foreground placeholder:text-muted-foreground",
          minHeightClassName,
        )}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={className}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
