'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, FileCode, Inbox, ArrowRight } from 'lucide-react';
import { DocumentoForm } from './documento-form';
import { DocumentoFormValues } from '@/core/application/schema/documento-schema';
import { Button } from "@/components/ui/button";
import { GRUPOS_DOCUMENTO } from "@/core/constants/grupos-documento"; // <--- IMPORTANTE

export default function DocumentosContainer() {
    const [viewState, setViewState] = useState<'list' | 'form'>('list');
    const [documents, setDocuments] = useState<DocumentoFormValues[]>([]);
    const [editingDoc, setEditingDoc] = useState<DocumentoFormValues | null>(null);

    // --- Handlers ---

    const handleAddNew = () => {
        setEditingDoc(null);
        setViewState('form');
    };

    const handleEdit = (doc: DocumentoFormValues) => {
        setEditingDoc(doc);
        setViewState('form');
    };

    const handleDelete = (id: string | undefined) => {
        if (!id) return;
        if (confirm("Tem certeza que deseja remover este modelo?")) {
            setDocuments(prev => prev.filter(d => d.id !== id));
        }
    };

    const handleSave = (data: DocumentoFormValues) => {
        if (editingDoc?.id) {
            // Atualizar existente
            setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...data, id: d.id } : d));
        } else {
            // Criar novo (Mock ID seguro)
            setDocuments(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
        }
        setViewState('list');
    };

    const handleCancel = () => {
        setViewState('list');
        setEditingDoc(null);
    };

    // --- Renderização ---

    if (viewState === 'form') {
        return (
            <DocumentoForm
                initialValues={editingDoc}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-card p-6 rounded-lg border border-border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-card-foreground">Modelos Configurados</h2>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie os parâmetros fiscais, regras de estoque e automações.</p>
                </div>
                <Button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus size={16} />
                    Novo Modelo
                </Button>
            </div>

            {/* Tabela */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                {documents.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
                        <div className="bg-muted/50 p-4 rounded-full mb-4">
                            <Inbox size={48} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-card-foreground">Nenhum modelo configurado</p>
                        <p className="text-sm max-w-sm mx-auto mt-2">Clique em "Novo Modelo" para criar sua primeira parametrização de documento fiscal.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                                <th className="p-4 font-semibold w-[30%]">Descrição</th>
                                <th className="p-4 font-semibold w-[30%]">Grupo de Negócio</th>
                                <th className="p-4 font-semibold text-center">Modelo/Série</th>
                                <th className="p-4 font-semibold">CFOP Padrão</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {documents.map((doc) => {
                                // Encontra o label bonito do grupo
                                const grupoLabel = GRUPOS_DOCUMENTO.find(g => g.value === doc.grupoDocumento)?.label;

                                return (
                                    <tr key={doc.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900">
                                                    <FileCode size={20} />
                                                </div>
                                                <span className="font-semibold text-card-foreground text-base">{doc.descricao}</span>
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-primary text-xs">{doc.grupoDocumento}</span>
                                                <span className="text-muted-foreground text-xs truncate max-w-[250px]" title={grupoLabel}>
                                                    {grupoLabel || "Grupo não identificado"}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className="px-3 py-1 bg-muted rounded-full text-xs font-mono font-medium border border-border">
                                                {doc.modelo} / {doc.serie}
                                            </span>
                                        </td>

                                        <td className="p-4 font-mono text-muted-foreground text-xs">
                                            <div className="flex flex-col gap-1">
                                                <span>INT: {doc.cfopEstadual || "-"}</span>
                                                <span>EXT: {doc.cfopInterestadual || "-"}</span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(doc)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
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
                )}
            </div>
        </div>
    );
}