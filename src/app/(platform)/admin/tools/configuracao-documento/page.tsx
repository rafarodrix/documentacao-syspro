import DocumentosContainer from '@/components/platform/tools/configuracao-documentos/documentos';

export default function ConfiguracaoDocumentoPage() {
    return (
        <main className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Configuração de Documentos Syspro</h1>
                <p className="text-slate-500">Definição de parâmetros fiscais, estoque e financeiro por tipo de documento.</p>
            </div>

            {/* O componente principal é chamado aqui */}
            <DocumentosContainer />
        </main>
    );
}