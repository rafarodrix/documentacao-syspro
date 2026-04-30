"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
      onChange(currentEditor.getHTML());
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          data-active={editor.isActive("link")}
          onClick={toggleLink}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {showTemplates ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-md border-border/60 text-xs">
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
