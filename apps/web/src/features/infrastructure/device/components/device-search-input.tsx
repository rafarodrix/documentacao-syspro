"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@dosc-syspro/ui";

type DeviceSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholderDesktop?: string;
  placeholderMobile?: string;
  debounceMs?: number;
};

export function DeviceSearchInput({
  value: externalValue,
  onChange,
  placeholderDesktop = "Buscar por dispositivo, empresa, CNPJ, hostname, IP ou ID RustDesk...",
  placeholderMobile = "Buscar dispositivos...",
  debounceMs = 300,
}: DeviceSearchInputProps) {
  const [inputValue, setInputValue] = useState(externalValue);

  useEffect(() => {
    setInputValue(externalValue);
  }, [externalValue]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (inputValue !== externalValue) {
        onChange(inputValue);
      }
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [inputValue, externalValue, onChange, debounceMs]);

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary" />
      <Input
        className="peer h-10 w-full rounded-md border-border/60 bg-background pl-10 pr-9 text-sm shadow-xs transition-colors focus-visible:ring-primary/20"
        placeholder={placeholderDesktop}
        aria-label="Buscar por dispositivo, empresa, CNPJ, hostname, IP ou ID RustDesk"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleClear}
          aria-label="Limpar pesquisa"
          title="Limpar pesquisa"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
