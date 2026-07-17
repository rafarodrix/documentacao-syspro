import { useState } from "react";
import { CopiedIcon, CopyIcon } from "./icons";

type CopyButtonTone = "default" | "dark";

type CopyButtonProps = {
  value: string;
  label?: string;
  tone?: CopyButtonTone;
  text?: string;
  copiedText?: string;
};

export function CopyButton({ value, label, tone = "default", text, copiedText = "Copiado" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fallback
    }
  };

  const className = tone === "dark" ? "btn-copy-dark" : "btn-copy";

  return (
    <button
      type="button"
      className={`${className} ${copied ? "copied" : ""} ${text ? "with-text" : ""}`}
      onClick={() => void handleCopy()}
      title={label ?? "Copiar"}
      aria-label={label ?? "Copiar"}
      disabled={!value}
    >
      {copied ? <CopiedIcon /> : <CopyIcon />}
      {text ? <span className="btn-copy-text">{copied ? copiedText : text}</span> : null}
    </button>
  );
}
