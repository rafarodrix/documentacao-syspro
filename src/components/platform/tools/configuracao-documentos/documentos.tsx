'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, FileCode } from 'lucide-react';
import { DocumentoForm } from './documento-form';
import { DocumentoFormValues } from '@/core/application/schema/documento-schema';

export default function DocumentosContainer() {
    const [viewState, setViewState] = useState<'list' | 'form'>('list');
    const [documents, setDocuments] = useState<DocumentoFormValues[]>([]);
    const [editingDoc, setEditingDoc] = useState<DocumentoFormValues | null>(null);

    // Handlers (Lógica de interação)
    const handleAddNew = () => {
        setEditingDoc(null);
        setViewState('form');
    };

    const handleEdit = (doc: DocumentoFormValues) => {
        setEditingDoc(doc);
        setViewState('form');
    };

    const handleSave = (data: DocumentoFormValues) => {
        if (editingDoc) {
            // Atualizar existente (mock)
            setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...data, id: d.id } : d));
        } else {
            // Criar novo (mock)
            setDocuments(prev => [...prev, { ...data, id: Math.random().toString() }]);
        }
        setViewState('list');
    };

    const handleCancel = () => {
        setViewState('list');
        setEditingDoc(null);
    };

    // Renderização Condicional
    if (viewState === 'form') {
        return (
            <DocumentoForm
                initialValues={editingDoc}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        );
    }

    // View: Tabela (Listagem)
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Modelos Configurados</h2>
                    <p className="text-sm text-slate-500">Gerencie os parâmetros fiscais e de estoque.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Novo Modelo
                </button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
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
                            <tr key={doc.id} className="hover:bg-slate-50">
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
                                <td className="p-4 font-mono text-slate-600">{doc.cfopEstadual}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(doc)} className="text-blue-600 hover:text-blue-800 mr-3">
                                        <Edit size={16} />
                                    </button>
                                    <button className="text-red-500 hover:text-red-700">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}