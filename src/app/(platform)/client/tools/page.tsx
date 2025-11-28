import { ToolsList } from "@/components/platform/tools/ToolsList";

export default function ClientToolsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Minhas Ferramentas</h1>
            <ToolsList isAdmin={false} />
        </div>
    );
}