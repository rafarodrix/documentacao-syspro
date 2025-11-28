import { ToolsList } from "@/components/platform/tools/ToolsList";

export default function AdminToolsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Ferramentas Administrativas</h1>
            <ToolsList isAdmin={true} />
        </div>
    );
}