"use client";

import React, { ComponentPropsWithoutRef, ReactNode, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, AlertTriangle, Check, Copy, Info, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketMessageContentProps = {
  body: string;
  className?: string;
};

function PreBlock({ className, children, ...props }: ComponentPropsWithoutRef<"pre"> & { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    if (!textRef.current) return;
    const codeText = textRef.current.innerText || "";
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar código:", err);
    }
  };

  // Extrai o nome da linguagem de programação dos filhos do pre
  let language = "CÓDIGO";
  
  if (children && typeof children === "object" && "props" in (children as any)) {
    const codeElement = children as any;
    const codeClass = codeElement.props?.className || "";
    const match = codeClass.match(/language-(\w+)/);
    if (match) {
      language = match[1].toUpperCase();
      // Mapeamentos amigáveis
      if (language === "JS") language = "JAVASCRIPT";
      if (language === "TS") language = "TYPESCRIPT";
      if (language === "PY") language = "PYTHON";
      if (language === "HTML") language = "HTML";
      if (language === "CSS") language = "CSS";
      if (language === "MD") language = "MARKDOWN";
      if (language === "SH" || language === "BASH") language = "SHELL";
    }
  }

  return (
    <div className="group relative w-full my-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-md">
      {/* Barra superior de identificação da linguagem */}
      <div className="flex h-9 items-center justify-between border-b border-white/5 bg-zinc-900/60 px-4 select-none">
        <span className="text-[10px] font-bold tracking-widest text-zinc-400 font-mono">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex h-6 items-center gap-1.5 rounded-md border border-white/5 bg-zinc-950 px-2 text-[10px] font-semibold text-zinc-400 transition-all shadow hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer",
            copied && "text-emerald-400 border-emerald-500/30 bg-emerald-950/20 hover:text-emerald-300"
          )}
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      <pre
        ref={textRef}
        {...props}
        className={cn(
          "max-w-full overflow-x-auto p-4 whitespace-pre text-zinc-100 font-mono text-[13px] leading-relaxed",
          className,
        )}
      >
        {children}
      </pre>
    </div>
  );
}

function getTextFromNode(node: ReactNode): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node.map(getTextFromNode).join("");
  }
  if (typeof node === "object" && "props" in node) {
    return getTextFromNode((node as any).props.children);
  }
  return "";
}

function removeCalloutHeader(node: ReactNode, type: string): ReactNode {
  if (!node) return node;
  const prefix = `[!${type}]`;
  
  if (typeof node === "string") {
    if (node.trim().startsWith(prefix)) {
      return node.replace(new RegExp(`^\\[!${type}\\]\\s*`, "i"), "");
    }
    return node;
  }
  
  if (Array.isArray(node)) {
    let removed = false;
    return node.map((child) => {
      if (removed) return child;
      const text = getTextFromNode(child);
      if (text.trim().startsWith(prefix)) {
        removed = true;
        return removeCalloutHeader(child, type);
      }
      return child;
    });
  }
  
  if (typeof node === "object" && "props" in node) {
    const element = node as any;
    return {
      ...element,
      props: {
        ...element.props,
        children: removeCalloutHeader(element.props.children, type)
      }
    };
  }
  
  return node;
}

function CalloutBlockquote({ children, ...props }: ComponentPropsWithoutRef<"blockquote">) {
  const textContent = getTextFromNode(children).trim();
  const match = textContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
  
  if (!match) {
    return (
      <blockquote
        {...props}
        className={cn(
          "border-l-4 border-primary/30 pl-4 text-muted-foreground italic my-3",
          props.className
        )}
      >
        {children}
      </blockquote>
    );
  }
  
  const type = match[1].toUpperCase();
  const cleanChildren = removeCalloutHeader(children, type);
  
  const styles = {
    NOTE: {
      border: "border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200",
      icon: <Info className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400 shrink-0" />,
      label: "Nota"
    },
    TIP: {
      border: "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
      icon: <Sparkles className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400 shrink-0" />,
      label: "Dica"
    },
    WARNING: {
      border: "border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200",
      icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400 shrink-0" />,
      label: "Atenção"
    },
    CAUTION: {
      border: "border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200",
      icon: <ShieldAlert className="h-4.5 w-4.5 text-rose-500 dark:text-rose-400 shrink-0" />,
      label: "Cuidado"
    },
    IMPORTANT: {
      border: "border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 text-purple-900 dark:text-purple-200",
      icon: <AlertCircle className="h-4.5 w-4.5 text-purple-500 dark:text-purple-400 shrink-0" />,
      label: "Importante"
    }
  }[type] || {
    border: "border-zinc-500/20 bg-zinc-500/5 text-zinc-900 dark:text-zinc-200",
    icon: <Info className="h-4.5 w-4.5 text-zinc-500 shrink-0" />,
    label: "Info"
  };

  return (
    <div className={cn("my-4 flex gap-3.5 rounded-xl border p-4.5 text-[13px] leading-relaxed shadow-sm", styles.border)}>
      {styles.icon}
      <div className="flex-1 min-w-0">
        <span className="block font-bold text-xs uppercase tracking-wider mb-1 opacity-90 select-none">{styles.label}</span>
        <div className="prose-inherit **:my-0">{cleanChildren}</div>
      </div>
    </div>
  );
}

function CustomListItem({ className, children, ...props }: ComponentPropsWithoutRef<"li"> & { children?: ReactNode }) {
  let isCheckbox = false;
  let isChecked = false;

  React.Children.forEach(children, (child) => {
    if (child && typeof child === "object" && "props" in (child as any)) {
      const el = child as any;
      if (el.type === "input" && el.props?.type === "checkbox") {
        isCheckbox = true;
        isChecked = Boolean(el.props.checked);
      }
    }
  });

  if (!isCheckbox) {
    return (
      <li {...props} className={cn("my-1.5 leading-relaxed", className)}>
        {children}
      </li>
    );
  }

  const cleanChildren = React.Children.map(children, (child) => {
    if (child && typeof child === "object" && "props" in (child as any)) {
      const el = child as any;
      if (el.type === "input" && el.props?.type === "checkbox") {
        return null;
      }
    }
    return child;
  });

  return (
    <li
      {...props}
      className={cn(
        "flex items-start gap-2.5 my-2.5 pl-0 list-none leading-relaxed text-sm select-none",
        isChecked && "text-muted-foreground/60 line-through transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all mt-0.5 shadow-sm",
          isChecked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        )}
      >
        {isChecked && <Check className="h-3 w-3 stroke-[3px]" />}
      </div>
      <div className="flex-1 min-w-0">{cleanChildren}</div>
    </li>
  );
}

function checkTreeContent(node: ReactNode): boolean {
  if (!node) return false;
  if (typeof node === "string") {
    return /├─|└─|│|──|┌─|┐─/.test(node);
  }
  if (typeof node === "number") return false;
  if (Array.isArray(node)) {
    return node.some(checkTreeContent);
  }
  if (typeof node === "object" && "props" in node) {
    return checkTreeContent((node as any).props.children);
  }
  return false;
}

function formatSoftBreaks(text: string): string {
  if (!text) return "";
  
  // Normaliza divisores de traços (ex: ------ ou =====) garantindo que tenham linhas vazias ao redor,
  // impedindo que o Markdown os interprete como títulos do tipo Setext (Heading 2) e coloque o bloco anterior todo em negrito.
  let normalized = text.replace(/^[ \t]*[-=]{3,}[ \t]*$/gm, "\n\n---\n\n");

  const parts = normalized.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        return part;
      }
      return part.replace(/(?<![ \t]{2})(?<!\\)\n/g, "  \n");
    })
    .join("");
}


export function TicketMessageContent({
  body,
  className,
}: TicketMessageContentProps) {
  const formattedBody = formatSoftBreaks(body);

  return (
    <div className={cn(ticketMessageContentClassName, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className: anchorClassName, ...props }: ComponentPropsWithoutRef<"a">) => (
            <a
              {...props}
              className={cn("break-all underline underline-offset-4", anchorClassName)}
              target="_blank"
              rel="noopener noreferrer nofollow"
            />
          ),
          pre: PreBlock,
          code: ({
            className: codeClassName,
            children,
            ...props
          }: ComponentPropsWithoutRef<"code"> & { children?: ReactNode }) => {
            const isInline = !String(codeClassName ?? "").includes("language-");
            return (
              <code
                {...props}
                className={cn(
                  isInline
                    ? "rounded bg-black/10 px-1.5 py-0.5 text-[0.92em] text-inherit dark:bg-white/10"
                    : "bg-transparent p-0 text-zinc-100",
                  codeClassName,
                )}
              >
                {children}
              </code>
            );
          },
          table: ({ className: tableClassName, ...props }: ComponentPropsWithoutRef<"table">) => (
            <div className="my-3 w-full overflow-x-auto">
              <table
                {...props}
                className={cn(
                  "w-full border-collapse overflow-hidden rounded-xl border border-border/70",
                  tableClassName,
                )}
              />
            </div>
          ),
          thead: ({ className: theadClassName, ...props }: ComponentPropsWithoutRef<"thead">) => (
            <thead {...props} className={cn("bg-muted/60", theadClassName)} />
          ),
          th: ({ className: thClassName, ...props }: ComponentPropsWithoutRef<"th">) => (
            <th
              {...props}
              className={cn(
                "border border-border/60 px-3 py-2 text-left align-top font-semibold text-foreground",
                thClassName,
              )}
            />
          ),
          td: ({ className: tdClassName, ...props }: ComponentPropsWithoutRef<"td">) => (
            <td
              {...props}
              className={cn(
                "border border-border/60 px-3 py-2 align-top text-foreground",
                tdClassName,
              )}
            />
          ),
          blockquote: CalloutBlockquote,
          img: ({ className: imageClassName, alt, ...props }: ComponentPropsWithoutRef<"img">) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              alt={alt ?? ""}
              className={cn(
                "my-3 max-h-128 w-auto max-w-full rounded-xl border border-border/60 object-contain",
                imageClassName,
              )}
            />
          ),
          p: ({ className: paragraphClassName, children, ...props }: ComponentPropsWithoutRef<"p"> & { children?: ReactNode }) => {
            const isTree = checkTreeContent(children);
            return (
              <p
                {...props}
                className={cn(
                  "whitespace-pre-wrap wrap-break-word",
                  isTree && "font-mono bg-zinc-50/50 dark:bg-zinc-950/20 border border-border/50 rounded-lg p-3 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 shadow-sm my-2",
                  paragraphClassName
                )}
              >
                {children}
              </p>
            );
          },
          ul: ({ className: listClassName, ...props }: ComponentPropsWithoutRef<"ul">) => (
            <ul {...props} className={cn("list-disc pl-6", listClassName)} />
          ),
          ol: ({ className: listClassName, ...props }: ComponentPropsWithoutRef<"ol">) => (
            <ol {...props} className={cn("list-decimal pl-6", listClassName)} />
          ),
          li: CustomListItem,
        }}
      >
        {formattedBody}
      </ReactMarkdown>
    </div>
  );
}

const ticketMessageContentClassName =
  "prose prose-sm min-w-0 max-w-full text-inherit wrap-anywhere **:max-w-full **:wrap-anywhere " +
  "[&_p]:whitespace-pre-wrap [&_p]:wrap-break-word [&_span]:wrap-break-word [&_strong]:wrap-break-word " +
  "[&_pre]:text-zinc-100 [&_pre_*]:text-zinc-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-zinc-100 " +
  "[&_table]:my-3 [&_tbody_tr:nth-child(even)]:bg-muted/25 [&_tbody_tr:hover]:bg-muted/35 " +
  "[&_th_p]:m-0 [&_td_p]:m-0 [&_li_p]:m-0 [&_img]:my-3";

