import { MoreHorizontal, Shield, User as UserIcon, Mail } from "lucide-react";
import { User } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function MembersTable({ users }: { users: User[] }) {
    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin": return <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">Admin</Badge>;
            case "member": return <Badge variant="secondary">Membro</Badge>;
            default: return <Badge variant="outline">Viewer</Badge>;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "text-emerald-600 bg-emerald-100";
            case "invited": return "text-amber-600 bg-amber-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{user.name}</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Mail size={10} /> {user.email}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(user.status)}`}>
                                    {user.status === 'active' ? 'Ativo' : user.status === 'invited' ? 'Pendente' : 'Inativo'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem>Editar Permissões</DropdownMenuItem>
                                        <DropdownMenuItem>Reenviar Convite</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">Remover da Equipe</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}