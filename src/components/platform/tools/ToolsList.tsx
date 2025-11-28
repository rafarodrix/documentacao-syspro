import { Card } from "@/components/ui/card";

export function ToolsList({ isAdmin = false }: { isAdmin?: boolean }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card title="Calculadora" />
            <Card title="Gerador de Docs" />
            {isAdmin && <Card title="Debug (Admin Only)" className="border-red-500" />}
        </div>
    );
}