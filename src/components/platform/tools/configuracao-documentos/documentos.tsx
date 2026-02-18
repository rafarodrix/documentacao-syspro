'use client';

import { useState, useEffect, useTransition } from 'react';
import {
    Plus, Edit, Trash2, FileCode, Inbox, Loader2,
    PackageCheck, PackageX, ScrollText, AlertCircle
} from 'lucide-react';
import { DocumentoForm } from './documento-form';
import { DocumentoFormValues } from '@/core/application/schema/documento-schema';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Certifique-se de ter este componente ou use classes Tailwind
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento";

// Import das Actions Reais
import { getDocumentos, saveDocumento, deleteDocumento } from '@/actions/documentos/documento-actions';

export default function DocumentosContainer() {
    const [viewState, setViewState] = useState<'list' | 'form'>('list');
    const [documents, setDocuments] = useState<DocumentoFormValues[]>([]);
    const [editingDoc, setEditingDoc] = useState<DocumentoFormValues | null>(null);

    // Estados de carregamento
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(true);

    // --- 1. Carregar dados ---
    const loadData = async () => {
        setIsLoading(true);
        try {
            const result = await getDocumentos();
            if (result.success && result.data) {
                setDocuments(result.data as unknown as DocumentoFormValues[]);
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

    // --- Handlers ---

    const handleAddNew = () => {
        setEditingDoc(null);
        setViewState('form');
    };

    const handleEdit = (doc: DocumentoFormValues) => {
        setEditingDoc(doc);
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

    // --- Helpers de Renderização ---

    // Renderiza badge de estoque
    const renderEstoqueBadge = (status: string) => {
        if (status === "NAO") {
            return (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs bg-muted px-2 py-1 rounded-md border border-border/50">
                    <PackageX size={14} /> <span>Sem Estoque</span>
                </div>
            );
        }
        const color = status === "ENTRADA" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100";
        return (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${color}`}>
                <PackageCheck size={14} />
                <span className="font-semibold">{status === "ENTRADA" ? "Entrada" : "Saída"}</span>
            </div>
        );
    };

    // --- Renderização Principal ---

    if (viewState === 'form') {
        return (
            <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
                <DocumentoForm
                    initialValues={editingDoc}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-6 rounded-xl border border-border shadow-sm gap-4">
                <div>
                    <h2 className="text-xl font-bold text-card-foreground flex items-center gap-3">
                        Modelos Configurados
                        {(isLoading || isPending) && <Loader2 className="animate-spin text-primary" size={20} />}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie a parametrização fiscal e regras de negócio.</p>
                </div>
                <Button onClick={handleAddNew} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                    <Plus size={18} />
                    Novo Modelo
                </Button>
            </div>

            {/* Tabela / Lista */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[300px]">
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-64 text-muted-foreground gap-3">
                        <Loader2 className="animate-spin h-8 w-8 text-primary/50" />
                        <span className="text-sm">Sincronizando dados...</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-80 text-muted-foreground p-8 text-center">
                        <div className="bg-muted/50 p-6 rounded-full mb-6 ring-1 ring-border">
                            <Inbox size={48} className="opacity-40" />
                        </div>
                        <h3 className="text-lg font-semibold text-card-foreground">Nenhum modelo encontrado</h3>
                        <p className="text-sm max-w-xs mx-auto mt-2 text-muted-foreground">
                            Comece criando um novo modelo de documento para configurar as regras fiscais.
                        </p>
                        <Button variant="outline" onClick={handleAddNew} className="mt-6">
                            Criar meu primeiro modelo
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/30 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="p-4 font-semibold w-[35%] pl-6">Identificação do Modelo</th>
                                    <th className="p-4 font-semibold w-[20%]">Configuração</th>
                                    <th className="p-4 font-semibold w-[30%]">Resumo Fiscal (CFOP)</th>
                                    <th className="p-4 font-semibold text-right pr-6">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {documents.map((doc) => {
                                    const grupoLabel = GRUPOS_DOCUMENTO.find(g => g.value === doc.grupoDocumento)?.label;

                                    // Verificadores de flags fiscais
                                    const hasST = doc.cfopEstadualST || doc.cfopInterestadualST;
                                    const hasConsumer = doc.cfopEstadualConsumidor || doc.cfopInterestadualConsumidor;
                                    const hasExterior = doc.cfopInternacional;

                                    return (
                                        <tr key={doc.id} className="hover:bg-muted/20 transition-colors group">
                                            {/* Coluna 1: Descrição e Grupo */}
                                            <td className="p-4 pl-6 align-top">
                                                <div className="flex gap-4">
                                                    <div className="mt-1 p-2.5 h-fit bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                                        <ScrollText size={20} strokeWidth={1.5} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-card-foreground text-base leading-tight mb-1">
                                                            {doc.descricao}
                                                        </p>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-mono text-muted-foreground font-medium flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                                                {doc.grupoDocumento}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[280px]" title={grupoLabel}>
                                                                {grupoLabel || "Grupo não identificado"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Coluna 2: Série, Modelo e Estoque */}
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-2 items-start">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-0.5 bg-muted rounded border border-border text-xs font-mono font-medium text-muted-foreground" title="Modelo">
                                                            Mod. {doc.modelo}
                                                        </span>
                                                        <span className="px-2.5 py-0.5 bg-muted rounded border border-border text-xs font-mono font-medium text-muted-foreground" title="Série">
                                                            Sér. {doc.serie}
                                                        </span>
                                                    </div>
                                                    {renderEstoqueBadge(doc.movimentaEstoque)}
                                                </div>
                                            </td>

                                            {/* Coluna 3: Fiscal (CFOPs e Flags) */}
                                            <td className="p-4 align-top">
                                                <div className="space-y-2">
                                                    {/* CFOP Principal */}
                                                    <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Interno</span>
                                                            <span className="text-card-foreground font-semibold">{doc.cfopEstadual || "----"}</span>
                                                        </div>
                                                        <div className="w-px bg-border h-8 mx-1"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Externo</span>
                                                            <span className="text-card-foreground font-semibold">{doc.cfopInterestadual || "----"}</span>
                                                        </div>
                                                    </div>

                                                    {/* Flags de Variações */}
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {hasST && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900">
                                                                ST
                                                            </span>
                                                        )}
                                                        {hasConsumer && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900">
                                                                CONS
                                                            </span>
                                                        )}
                                                        {hasExterior && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900">
                                                                EXP
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Coluna 4: Ações */}
                                            <td className="p-4 pr-6 align-middle text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(doc)}
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                                        title="Editar Parametrização"
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                        title="Excluir Modelo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}