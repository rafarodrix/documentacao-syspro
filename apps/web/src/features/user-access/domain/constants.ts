import { Role } from "@prisma/client";

export const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
export const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];
export const READ_ROLES: Role[] = [...SYSTEM_ROLES, Role.CLIENTE_ADMIN];