export type Role = "admin" | "member" | "viewer";

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string;
    status: "active" | "invited" | "inactive";
    joinedAt: string;
}

export interface Company {
    id: string;
    name: string;
    cnpj: string;
    plan: string;
    currentUserRole: Role; // Importante: Saber qual o papel do usuário logado NESTA empresa
    users: User[];
}