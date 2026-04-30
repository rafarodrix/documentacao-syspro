"use client";

import { useEffect, type ComponentProps, type MouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Code2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TicketRichTextEditorTemplate = {
  id: string;
  label: string;
  html: string;
};

type TicketRichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  minHeightClassName?: string;
  templates?: TicketRichTextEditorTemplate[];
  showTemplates?: boolean;
  compact?: boolean;
};

function sanitizeEditorHtml(html: string) {
  return html
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sclass="[^"]*"/gi, "")
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, "");
}

const DEFAULT_TEMPLATES: TicketRichTextEditorTemplate[] = [
  {
    id: "reproducao",
    label: "Passos para reproduzir",
    html: "<h2>Passos para reproduzir</h2><ol><li></li><li></li><li></li></ol><h3>Resultado atual</h3><p></p><h3>Resultado esperado</h3><p></p>",
  },
  {
    id: "impacto",
    label: "Impacto e urgencia",
    html: "<h2>Impacto</h2><ul><li>Usuarios afetados:</li><li>Processo afetado:</li><li>Frequencia:</li></ul><h3>Urgencia operacional</h3><p></p>",
  },
  {
    id: "analise",
    label: "Contexto tecnico",
    html: "<h2>Contexto tecnico</h2><ul><li>Base/ambiente:</li><li>Modulo:</li><li>Versao:</li><li>Mensagem de erro:</li></ul><h3>Evidencias</h3><p></p>",
  },
];

export function TicketRichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeightClassName = "min-h-80",
  templates = DEFAULT_TEMPLATES,
  showTemplates = true,
  compact = false,
}: TicketRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      transformPastedHTML: sanitizeEditorHtml,
      transformPastedText: (text) => text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " "),
      attributes: {
        class: cn(
          "ticket-rich-text-editor__content prose prose-sm max-w-none px-4 py-3 text-foreground outline-none",
          "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
          "prose-code:text-foreground prose-pre:bg-muted/70 prose-pre:text-foreground",
          "prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground",
          minHeightClassName,
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeEditorHtml(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();

    if (value !== currentHtml) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className={cn("rounded-xl border border-border/60 bg-muted/20", minHeightClassName, className)} />;
  }

  const activeEditor = editor;
  const preserveEditorSelection = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const currentBlockType = editor.isActive("heading", { level: 2 })
    ? "heading-2"
    : editor.isActive("heading", { level: 3 })
      ? "heading-3"
      : "paragraph";

  function applyBlockType(value: string) {
    const chain = activeEditor.chain().focus();

    if (value === "heading-2") {
      chain.toggleHeading({ level: 2 }).run();
      return;
    }

    if (value === "heading-3") {
      chain.toggleHeading({ level: 3 }).run();
      return;
    }

    chain.setParagraph().run();
  }

  function insertTemplate(templateHtml: string) {
    activeEditor.chain().focus().insertContent(templateHtml).run();
  }

  function toggleLink() {
    const previousUrl = activeEditor.getAttributes("link").href as string | undefined;
    const nextUrl = window.prompt("Informe a URL do link", previousUrl || "https://");

    if (nextUrl === null) return;

    const trimmedUrl = nextUrl.trim();

    if (!trimmedUrl) {
      activeEditor.chain().focus().unsetLink().run();
      return;
    }

    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: trimmedUrl }).run();
  }

  const toolbarButtonClassName =
    "h-8 rounded-md border border-transparent px-2.5 text-muted-foreground hover:text-foreground data-[active=true]:border-border/80 data-[active=true]:bg-background data-[active=true]:text-foreground";

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm", className)}>
      <div className={cn("flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-3 py-2", compact && "gap-1.5 px-2.5 py-2")}>
        <div className="min-w-[9rem]">
          <Select value={currentBlockType} onValueChange={applyBlockType}>
            <SelectTrigger
              className="h-8 border-border/60 bg-background text-xs"
              onMouseDown={(event) => event.preventDefault()}
            >
              <div className="flex items-center gap-2">
                <Pilcrow className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Normal</SelectItem>
              <SelectItem value="heading-2">Titulo</SelectItem>
              <SelectItem value="heading-3">Subtitulo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToolbarButton
          label="Desfazer"
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className={toolbarButtonClassName}
        >
          <ArrowLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Refazer"
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className={toolbarButtonClassName}
        >
          <ArrowRight className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border/60" />
        <ToolbarButton
          label="Negrito"
          active={editor.isActive("bold")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolbarButtonClassName}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italico"
          active={editor.isActive("italic")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolbarButtonClassName}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Sublinhado"
          active={editor.isActive("underline")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={toolbarButtonClassName}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Tachado"
          active={editor.isActive("strike")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={toolbarButtonClassName}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          active={editor.isActive("bulletList")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={toolbarButtonClassName}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={toolbarButtonClassName}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Citacao"
          active={editor.isActive("blockquote")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={toolbarButtonClassName}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bloco de codigo"
          active={editor.isActive("codeBlock")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={toolbarButtonClassName}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onMouseDown={preserveEditorSelection}
          onClick={toggleLink}
          className={toolbarButtonClassName}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Limpar formatacao"
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
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
                  onMouseDown={preserveEditorSelection}
                >
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs">Blocos sugeridos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {templates.map((template) => (
                  <DropdownMenuItem key={template.id} className="text-xs" onClick={() => insertTemplate(template.html)}>
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            {editor.getText().trim().length} caracteres
          </span>
        </div>
      </div>

      <EditorContent editor={editor} className="bg-background" />
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  active,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  label: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={className}
          data-active={active}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
