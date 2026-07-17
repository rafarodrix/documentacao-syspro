import { useState } from "react";
import { CopiedIcon, CopyIcon } from "./icons";

type CopyButtonTone = "default" | "dark";

type CopyButtonProps = {
  value: string;
  label?: string;
  tone?: CopyButtonTone;
};

export function CopyButton({ value, label, tone = "default" }: CopyButtonProps) {
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
      className={`${className} ${copied ? "copied" : ""}`}
      onClick={() => void handleCopy()}
      title={label ?? "Copiar"}
      disabled={!value}
    >
      {copied ? <CopiedIcon /> : <CopyIcon />}
    </button>
  );
}
