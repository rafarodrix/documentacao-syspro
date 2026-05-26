"use client";

import { ComponentPropsWithoutRef, ReactNode, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
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
    // Pega o texto limpo de dentro do bloco
    const codeText = textRef.current.innerText || "";
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar código:", err);
    }
  };

  return (
    <div className="group relative w-full my-3">
      <pre
        ref={textRef}
        {...props}
        className={cn(
          "max-w-full overflow-x-auto rounded-lg border border-white/10 bg-zinc-950 p-3.5 pr-12 whitespace-pre-wrap text-zinc-100 font-mono text-[13px] leading-relaxed shadow-sm",
          className,
        )}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-900 text-zinc-400 opacity-0 transition-all shadow hover:bg-zinc-800 hover:text-zinc-100 focus:opacity-100 group-hover:opacity-100 cursor-pointer",
          copied && "opacity-100 text-emerald-400 border-emerald-500/30 bg-emerald-950/20 hover:text-emerald-300"
        )}
        title="Copiar código"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export function TicketMessageContent({
  body,
  className,
}: TicketMessageContentProps) {
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
          blockquote: ({
            className: blockquoteClassName,
            ...props
          }: ComponentPropsWithoutRef<"blockquote">) => (
            <blockquote
              {...props}
              className={cn(
                "border-l-4 border-primary/40 pl-4 text-muted-foreground",
                blockquoteClassName,
              )}
            />
          ),
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
          p: ({ className: paragraphClassName, ...props }: ComponentPropsWithoutRef<"p">) => (
            <p {...props} className={cn("whitespace-normal wrap-break-word", paragraphClassName)} />
          ),
          ul: ({ className: listClassName, ...props }: ComponentPropsWithoutRef<"ul">) => (
            <ul {...props} className={cn("list-disc pl-6", listClassName)} />
          ),
          ol: ({ className: listClassName, ...props }: ComponentPropsWithoutRef<"ol">) => (
            <ol {...props} className={cn("list-decimal pl-6", listClassName)} />
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

const ticketMessageContentClassName =
  "prose prose-sm min-w-0 max-w-full text-inherit wrap-anywhere **:max-w-full **:wrap-anywhere " +
  "[&_p]:whitespace-normal [&_p]:wrap-break-word [&_span]:wrap-break-word [&_strong]:wrap-break-word " +
  "[&_pre]:text-zinc-100 [&_pre_*]:text-zinc-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-zinc-100 " +
  "[&_table]:my-3 [&_tbody_tr:nth-child(even)]:bg-muted/25 [&_tbody_tr:hover]:bg-muted/35 " +
  "[&_th_p]:m-0 [&_td_p]:m-0 [&_li_p]:m-0 [&_img]:my-3";

