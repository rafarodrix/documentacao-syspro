"use client";

import { Printer } from "lucide-react";
import { Button } from "@dosc-syspro/ui";

interface DocsPrintButtonProps {
  onPrint: () => void;
  disabled?: boolean;
  label?: string;
}

export function DocsPrintButton({
  onPrint,
  disabled = false,
  label = "Imprimir documento",
}: DocsPrintButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onPrint}
      disabled={disabled}
      className="gap-2 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
