"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Boxes } from "lucide-react";
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
  code: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  replacedByCode: string | null;
  actType: string | null;
  actNumber: string | null;
  actYear: string | null;
  lastUpdated: Date;
};

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

function TaxNcmPanelComponent({ items }: { items: Item[] }) {
  const INITIAL_ROWS = 80;
  const [query, setQuery] = useState("");
  const [vigencia, setVigencia] = useState<VigenciaFilter>("all");
  const [groupCode, setGroupCode] = useState<string>("all");
  const [subgroupCode, setSubgroupCode] = useState<string>("all");
  const [itemCode, setItemCode] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const [ready, setReady] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_ROWS);
  }, [deferredQuery, vigencia, groupCode, subgroupCode, itemCode]);

  const sourceItems = ready ? items : [];

  const validNcms = useMemo(() => {
    return sourceItems.filter((entry) => /^\d{8}$/.test(entry.code));
  }, [sourceItems]);

  const baseFiltered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return validNcms.filter((item) => {
      const matchQuery =
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.replacedByCode ?? "").toLowerCase().includes(q) ||
        (item.actType ?? "").toLowerCase().includes(q);

      const matchVigencia = vigencia === "all" ? true : getVigencia(item.startDate, item.endDate) === vigencia;
      return (q ? matchQuery : true) && matchVigencia;
    });
  }, [validNcms, deferredQuery, vigencia]);

  const groupOptions = useMemo(() => {
    const map = new Map<string, { count: number; description: string }>();
    for (const item of baseFiltered) {
      const key = item.code.slice(0, 2);
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          count: 1,
          description: item.description,
        });
      } else {
        map.set(key, {
          count: current.count + 1,
          description: current.description,
        });
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [baseFiltered]);

  const subgroupOptions = useMemo(() => {
    if (groupCode === "all") return [] as Array<[string, { count: number; description: string }]>;
    const source = baseFiltered.filter((item) => item.code.startsWith(groupCode));
    const map = new Map<string, { count: number; description: string }>();
    for (const item of source) {
      const key = item.code.slice(0, 4);
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          count: 1,
          description: item.description,
        });
      } else {
        map.set(key, {
          count: current.count + 1,
          description: current.description,
        });
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [baseFiltered, groupCode]);

  const itemOptions = useMemo(() => {
    if (subgroupCode === "all") return [] as Array<[string, { count: number; description: string }]>;
    const source = baseFiltered.filter((entry) => entry.code.startsWith(subgroupCode));
    const map = new Map<string, { count: number; description: string }>();
    for (const entry of source) {
      const key = entry.code.slice(0, 6);
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          count: 1,
          description: entry.description,
        });
      } else {
        map.set(key, {
          count: current.count + 1,
          description: current.description,
        });
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [baseFiltered, subgroupCode]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((entry) => {
      if (groupCode !== "all" && !entry.code.startsWith(groupCode)) return false;
      if (subgroupCode !== "all" && !entry.code.startsWith(subgroupCode)) return false;
      if (itemCode !== "all" && !entry.code.startsWith(itemCode)) return false;
      return true;
    });
  }, [baseFiltered, groupCode, subgroupCode, itemCode]);

  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMoreRows = visibleRows.length < filtered.length;

  const handleSync = () => {
    window.dispatchEvent(new CustomEvent("tax-sync:resume", { detail: { mode: "ncm" } }));
  };

  const handleGroupChange = (next: string) => {
    setGroupCode(next);
    setSubgroupCode("all");
    setItemCode("all");
  };

  const handleSubgroupChange = (next: string) => {
    setSubgroupCode(next);
    setItemCode("all");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar NCM por código, descrição, substituição ou tipo de ato..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-2 text-sm"
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value as VigenciaFilter)}
        >
          <option value="all">Vigência: todas</option>
          <option value="active">Ativas</option>
          <option value="future">Futuras</option>
          <option value="expired">Expiradas</option>
        </select>
        <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
          NCM válidos: <span className="font-semibold text-foreground">{validNcms.length}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="h-10 rounded-md border bg-background px-2 text-sm"
          value={groupCode}
          onChange={(e) => handleGroupChange(e.target.value)}
        >
          <option value="all">Grupo (2 dígitos): todos</option>
          {groupOptions.map(([code, meta]) => (
            <option key={code} value={code}>
              {code} - {meta.description} ({meta.count})
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border bg-background px-2 text-sm"
          value={subgroupCode}
          onChange={(e) => handleSubgroupChange(e.target.value)}
        >
          <option value="all">
            {groupCode === "all" ? "Subgrupo (4 dígitos): selecione o grupo" : "Subgrupo (4 dígitos): todos"}
          </option>
          {subgroupOptions.map(([code, meta]) => (
            <option key={code} value={code}>
              {code} - {meta.description} ({meta.count})
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border bg-background px-2 text-sm"
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
        >
          <option value="all">
            {subgroupCode === "all" ? "Item (6 dígitos): selecione o subgrupo" : "Item (6 dígitos): todos"}
          </option>
          {itemOptions.map(([code, meta]) => (
            <option key={code} value={code}>
              {code} - {meta.description} ({meta.count})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-card">
        <div className="border-b bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="h-4 w-4" />
            NCM válidos no recorte ({filtered.length})
          </h3>
        </div>

        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[140px]">NCM</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[150px]">Substitui por</TableHead>
                <TableHead className="w-[120px]">Início</TableHead>
                <TableHead className="w-[120px]">Fim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <span>Nenhum NCM encontrado com os filtros atuais.</span>
                      <Button size="sm" onClick={handleSync}>
                        Sincronizar NCM
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      {(item.actType || item.actNumber || item.actYear) && (
                        <div className="text-xs text-muted-foreground">
                          Ato: {[item.actType, item.actNumber, item.actYear].filter(Boolean).join(" / ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.replacedByCode ?? "-"}</TableCell>
                    <TableCell className="text-xs">{fmtDate(item.startDate)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(item.endDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMoreRows ? (
          <div className="flex justify-center border-t p-3">
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((prev) => prev + INITIAL_ROWS)}>
              Mostrar mais ({filtered.length - visibleRows.length} restantes)
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const TaxNcmPanel = memo(TaxNcmPanelComponent);

