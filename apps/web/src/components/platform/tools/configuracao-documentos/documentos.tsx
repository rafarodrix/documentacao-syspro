'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import {
  Plus, Edit, Trash2, Inbox, Loader2,
  PackageCheck, PackageX, ScrollText
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DocumentoForm } from './documento-form';
import { type DocumentoFormValues } from '@dosc-syspro/contracts/documento';
import type { DocumentoItem } from '@/features/documentos/domain/documento.types';
import { Button, DataTable } from "@dosc-syspro/ui";
import { GRUPOS_DOCUMENTO } from "@dosc-syspro/contracts/documento-config";
import { getDocumentos, saveDocumento, deleteDocumento } from '@/features/documentos/application/documento-write.actions';

export default function DocumentosContainer() {
  const [viewState, setViewState] = useState<'list' | 'form'>('list');
  const [documents, setDocuments] = useState<DocumentoItem[]>([]);
  const [editingDoc, setEditingDoc] = useState<DocumentoFormValues | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getDocumentos();
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toFormValues = (doc: DocumentoItem): DocumentoFormValues => ({
    id: doc.id,
    empresa: doc.empresa ?? "",
    descricao: doc.descricao,
    grupoDocumento: doc.grupoDocumento,
    modelo: doc.modelo,
    serie: doc.serie,
    emitente: doc.emitente ?? "PROPRIO",
    maximoItens: doc.maximoItens ?? 999,
    atualizaComercial: doc.atualizaComercial ?? true,
    processamentoEtapa: doc.processamentoEtapa ?? false,
    movimentaEstoque: (["SAIDA", "ENTRADA", "NAO"].includes(doc.movimentaEstoque)
      ? doc.movimentaEstoque
      : "SAIDA") as "SAIDA" | "ENTRADA" | "NAO",
    finalidadeNFe: doc.finalidadeNFe,
    tpNFCredito: doc.tpNFCredito ?? "",
    tpNFDebito: doc.tpNFDebito ?? "",
    cfopEstadual: doc.cfopEstadual ?? "",
    cfopInterestadual: doc.cfopInterestadual ?? "",
    cfopEstadualST: doc.cfopEstadualST ?? "",
    cfopInterestadualST: doc.cfopInterestadualST ?? "",
    cfopEstadualConsumidor: doc.cfopEstadualConsumidor ?? "",
    cfopInterestadualConsumidor: doc.cfopInterestadualConsumidor ?? "",
    cfopInternacional: doc.cfopInternacional ?? "",
    comportamentos: doc.comportamentos ?? [],
  });

  const handleAddNew = () => {
    setEditingDoc(null);
    setViewState('form');
  };

  const handleEdit = (doc: DocumentoItem) => {
    setEditingDoc(toFormValues(doc));
    setViewState('form');
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;

    if (confirm("Tem certeza que deseja remover este modelo do banco de dados?")) {
      startTransition(async () => {
        const result = await deleteDocumento(id);
        if (result.success) {
          await loadData();
        } else {
          alert("Erro ao excluir!");
        }
      });
    }
  };

  const handleSave = async (data: DocumentoFormValues) => {
    startTransition(async () => {
      const result = await saveDocumento(data);
      if (result.success) {
        await loadData();
        setViewState('list');
      } else {
        alert(`Erro ao salvar: ${result.error}`);
      }
    });
  };

  const handleCancel = () => {
    setViewState('list');
    setEditingDoc(null);
  };

  const renderEstoqueBadge = (status: string) => {
    if (status === "NAO") {
      return (
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted px-2 py-1 text-xs text-muted-foreground">
          <PackageX size={14} /> <span>Sem Estoque</span>
        </div>
      );
    }
    const color = status === "ENTRADA" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100";
    return (
      <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${color}`}>
        <PackageCheck size={14} />
        <span className="font-semibold">{status === "ENTRADA" ? "Entrada" : "Saida"}</span>
      </div>
    );
  };

  const columns = useMemo<ColumnDef<DocumentoItem>[]>(() => [
    {
      id: 'identificacao',
      header: 'Identificacao do Modelo',
      meta: { className: 'px-6' },
      cell: ({ row }) => {
        const grupoLabel = GRUPOS_DOCUMENTO.find((g) => g.value === row.original.grupoDocumento)?.label;
        return (
          <div className="flex gap-4">
            <div className="mt-1 h-fit rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400">
              <ScrollText size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="mb-1 text-base font-semibold leading-tight text-card-foreground">
                {row.original.descricao}
              </p>
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                  {row.original.grupoDocumento}
                </span>
                <span className="max-w-70 truncate text-xs text-muted-foreground" title={grupoLabel}>
                  {grupoLabel || "Grupo nao identificado"}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'configuracao',
      header: 'Configuracao',
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground" title="Modelo">
              Mod. {row.original.modelo}
            </span>
            <span className="rounded border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground" title="Serie">
              Ser. {row.original.serie}
            </span>
          </div>
          {renderEstoqueBadge(row.original.movimentaEstoque)}
        </div>
      ),
    },
    {
      id: 'resumoFiscal',
      header: 'Resumo Fiscal (CFOP)',
      cell: ({ row }) => {
        const hasST = row.original.cfopEstadualST || row.original.cfopInterestadualST;
        const hasConsumer = row.original.cfopEstadualConsumidor || row.original.cfopInterestadualConsumidor;
        const hasExterior = row.original.cfopInternacional;
        return (
          <div className="space-y-2">
            <div className="flex gap-4 text-xs font-mono text-muted-foreground">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground/60">Interno</span>
                <span className="font-semibold text-card-foreground">{row.original.cfopEstadual || "----"}</span>
              </div>
              <div className="mx-1 h-8 w-px bg-border"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground/60">Externo</span>
                <span className="font-semibold text-card-foreground">{row.original.cfopInterestadual || "----"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hasST ? <span className="rounded border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">ST</span> : null}
              {hasConsumer ? <span className="rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">CONS</span> : null}
              {hasExterior ? <span className="rounded border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">EXP</span> : null}
            </div>
          </div>
        );
      },
    },
    {
      id: 'acoes',
      header: () => <div className="text-right">Acoes</div>,
      meta: { className: 'px-6 text-right' },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50"
            title="Editar Parametrizacao"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            title="Excluir Modelo"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ], []);

  const renderMobileItem = (doc: DocumentoItem) => {
    const grupoLabel = GRUPOS_DOCUMENTO.find((g) => g.value === doc.grupoDocumento)?.label;
    const hasST = doc.cfopEstadualST || doc.cfopInterestadualST;
    const hasConsumer = doc.cfopEstadualConsumidor || doc.cfopInterestadualConsumidor;
    const hasExterior = doc.cfopInternacional;

    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{doc.descricao}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{grupoLabel || doc.grupoDocumento}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)} className="h-8 w-8 p-0">
              <Edit size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="h-8 w-8 p-0">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">Mod. {doc.modelo}</span>
          <span className="rounded border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">Ser. {doc.serie}</span>
          {renderEstoqueBadge(doc.movimentaEstoque)}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-mono">Int. {doc.cfopEstadual || "----"}</span>
          <span className="font-mono">Ext. {doc.cfopInterestadual || "----"}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hasST ? <span className="rounded border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">ST</span> : null}
          {hasConsumer ? <span className="rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">CONS</span> : null}
          {hasExterior ? <span className="rounded border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">EXP</span> : null}
        </div>
      </div>
    );
  };

  if (viewState === 'form') {
    return (
      <div className={isPending ? "pointer-events-none opacity-50" : ""}>
        <DocumentoForm
          initialValues={editingDoc}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="animate-in space-y-6 fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-bold text-card-foreground">
            Modelos Configurados
            {(isLoading || isPending) ? <Loader2 className="animate-spin text-primary" size={20} /> : null}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie a parametrizacao fiscal e regras de negocio.</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
          <Plus size={18} />
          Novo Modelo
        </Button>
      </div>

      <div className="min-h-75 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            <span className="text-sm">Sincronizando dados...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="mb-6 rounded-full bg-muted/50 p-6 ring-1 ring-border">
              <Inbox size={48} className="opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground">Nenhum modelo encontrado</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Comece criando um novo modelo de documento para configurar as regras fiscais.
            </p>
            <Button variant="outline" onClick={handleAddNew} className="mt-6">
              Criar meu primeiro modelo
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={documents}
            flexible={true}
            minWidthClassName="min-w-[980px]"
            cardClassName="border-none bg-transparent shadow-none rounded-none animate-none"
            emptyState={{
              title: "Nenhum modelo encontrado",
              description: "Comece criando um novo modelo de documento para configurar as regras fiscais.",
              icon: Inbox,
            }}
            rowClassName="hover:bg-muted/20 transition-colors"
            renderMobileItem={renderMobileItem}
          />
        )}
      </div>
    </div>
  );
}
