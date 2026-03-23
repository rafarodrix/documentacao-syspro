"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TaxAnexoListItem } from "@/features/tax/domain/model";

type VigenciaFilter = "all" | "active" | "future" | "expired";

function fmtDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function getVigencia(startDate: Date | null, endDate: Date | null): Exclude<VigenciaFilter, "all"> {
  const now = new Date();
  if (startDate && startDate > now) return "future";
  if (endDate && endDate < now) return "expired";
  return "active";
}

function TaxAnexosPanelComponent({ items }: { items: TaxAnexoListItem[] }) {
  const PAGE_SIZE = 120;
  const [query, setQuery] = useState("");
  const [vigencia, setVigencia] = useState<VigenciaFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      if (item.category) values.add(item.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchQuery =
        (item.code ?? "").toLowerCase().includes(q) ||
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q) ||
        item.externalKey.toLowerCase().includes(q);

      const matchVigencia = vigencia === "all" ? true : getVigencia(item.startDate, item.endDate) === vigencia;
      const matchCategory = category === "all" ? true : (item.category ?? "") === category;

      return (q ? matchQuery : true) && matchVigencia && matchCategory;
    });
  }, [category, deferredQuery, items, vigencia]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQuery, vigencia, category]);

  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleRows.length < filtered.length;

  const handleSync = () => {
    window.dispatchEvent(new CustomEvent("tax-sync:resume", { detail: { mode: "anexos" } }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar anexos por codigo, titulo, descricao ou categoria..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value as VigenciaFilter)}
          >
            <option value="all">Vigencia: todas</option>
            <option value="active">Ativas</option>
            <option value="future">Futuras</option>
            <option value="expired">Expiradas</option>
          </select>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Categoria: todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="border-b bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Anexos sincronizados ({filtered.length})
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
                    <div className="flex flex-col items-center gap-3">
                      <span>Nenhum anexo encontrado com os filtros atuais.</span>
                      <Button size="sm" onClick={handleSync}>
                        Sincronizar anexos
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.code ?? item.externalKey}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.title ?? "Sem titulo"}</div>
                      {item.description ? (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{item.description}</div>
                      ) : null}
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
        {hasMore ? (
          <div className="flex justify-center border-t p-3">
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
              Mostrar mais ({filtered.length - visibleRows.length} restantes)
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const TaxAnexosPanel = memo(TaxAnexosPanelComponent);
