'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, FileCode, Inbox } from 'lucide-react';
import { DocumentoForm } from './documento-form';
import { DocumentoFormValues } from '@/core/application/schema/documento-schema';
import { Button } from "@/components/ui/button";

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
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Modelos Configurados</h2>
                    <p className="text-sm text-slate-500">Gerencie os parâmetros fiscais e de estoque.</p>
                </div>
                <Button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} />
                    Novo Modelo
                </Button>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                {documents.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-slate-400">
                        <Inbox size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum modelo configurado</p>
                        <p className="text-sm">Clique em "Novo Modelo" para começar.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                            <tr>
                                <th className="p-4 font-semibold">Descrição</th>
                                <th className="p-4 font-semibold">Grupo</th>
                                <th className="p-4 font-semibold text-center">Modelo/Série</th>
                                <th className="p-4 font-semibold">CFOP Padrão</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                            <FileCode size={18} />
                                        </div>
                                        <span className="font-medium text-slate-700">{doc.descricao}</span>
                                    </td>
                                    <td className="p-4 text-slate-600">{doc.grupoDocumento}</td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 border">
                                            {doc.modelo} / {doc.serie}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-slate-600">
                                        {doc.cfopEstadual || "-"}
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => handleEdit(doc)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors mr-1"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}