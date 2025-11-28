import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, UserCheck } from "lucide-react";
import NumberTicker from "@/components/magicui/NumberTicker";

// --- SUB-COMPONENTE DE CARD (Reutilizável) ---
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
}

function StatCard({ title, value, icon: Icon, colorClass, bgClass }: StatCardProps) {
    return (
        <Card className="group relative overflow-hidden border-border/60 bg-background/50 backdrop-blur-xl transition-all hover:border-primary/20 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase text-[11px]">
                    {title}
                </CardTitle>
                <div className={`p-2 rounded-full transition-colors group-hover:bg-background ${bgClass}`}>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">
                    <NumberTicker value={value} />
                </div>
            </CardContent>
        </Card>
    );
}

export function UserStats({ users }: { users: any[] }) {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const adminUsers = users.filter(u => u.role === 'ADMIN' || u.role === 'DEVELOPER').length;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Total de Usuários"
                value={totalUsers}
                icon={Users}
                colorClass="text-blue-600"
                bgClass="bg-blue-500/10"
            />
            <StatCard
                title="Usuários Ativos"
                value={activeUsers}
                icon={UserCheck}
                colorClass="text-emerald-600"
                bgClass="bg-emerald-500/10"
            />
            <StatCard
                title="Administradores"
                value={adminUsers}
                icon={ShieldCheck}
                colorClass="text-purple-600"
                bgClass="bg-purple-500/10"
            />
        </div>
    );
}