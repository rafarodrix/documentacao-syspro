import { ToolsHub } from "@/components/platform/tools/ToolsHub";

export default function ClientToolsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Ferramentas</h1>
                <p className="text-muted-foreground">Utilitários para facilitar sua gestão.</p>
            </div>
            {/* Passa o caminho base do cliente */}
            <ToolsHub basePath="/app/tools" />
        </div>
    );
}