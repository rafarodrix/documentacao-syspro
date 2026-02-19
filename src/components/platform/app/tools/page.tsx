import { ToolsHub } from "@/components/platform/tools/ToolsHub";

export default function AdminToolsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Central de Ferramentas (Admin)</h1>
                <p className="text-muted-foreground">Acesso administrativo a todos os utilitários.</p>
            </div>
            {/* Passa o caminho base do admin */}
            <ToolsHub basePath="/app/tools" />
        </div>
    );
}