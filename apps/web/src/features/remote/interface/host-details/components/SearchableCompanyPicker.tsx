import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UNLINKED_COMPANY_VALUE } from "../constants";

function normalizeCompanySearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s|/-]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function SearchableCompanyPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalizeCompanySearch(query);
    if (!q) return options;
    return options.filter((option) => normalizeCompanySearch(option.label).includes(q));
  }, [options, query]);
  const selectedLabel =
    value === UNLINKED_COMPANY_VALUE
      ? "Sem vinculo"
      : options.find((option) => option.id === value)?.label ?? "Selecionar empresa";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between">
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar empresa..."
          className="mb-2"
        />
        <div className="max-h-60 space-y-1 overflow-auto">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              onChange(UNLINKED_COMPANY_VALUE);
              setOpen(false);
            }}
          >
            <span>Sem vinculo</span>
            {value === UNLINKED_COMPANY_VALUE ? <Check className="h-4 w-4" /> : null}
          </button>
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span className="truncate">{option.label}</span>
              {value === option.id ? <Check className="h-4 w-4" /> : null}
            </button>
          ))}
          {!filtered.length ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma empresa encontrada.</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
