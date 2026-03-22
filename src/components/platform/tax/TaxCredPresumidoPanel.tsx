"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Item = {
  id: string;
  externalKey: string;
  code: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  publishDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
};

function fmtDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function TaxCredPresumidoPanel({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.code, item.title, item.description, item.category, item.externalKey]
        .map((v) => (v ?? "").toLowerCase())
        .some((text) => text.includes(q)),
    );
  }, [items, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar credito presumido por codigo, titulo, descricao ou categoria..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <div className="border-b bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4" />
            Credito presumido sincronizado ({filtered.length})
          </h3>
        </div>

        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[140px]">Codigo</TableHead>
                <TableHead>Titulo / Descricao</TableHead>
                <TableHead className="w-[130px]">Categoria</TableHead>
                <TableHead className="w-[110px]">Inicio</TableHead>
                <TableHead className="w-[110px]">Fim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum registro de credito presumido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.code ?? item.externalKey}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.title ?? "Sem titulo"}</div>
                      {item.description ? <div className="line-clamp-2 text-xs text-muted-foreground">{item.description}</div> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.category ?? "-"}</TableCell>
                    <TableCell className="text-xs">{fmtDate(item.startDate)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(item.endDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

