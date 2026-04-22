import type { Role } from "@prisma/client";
import type { CreateUserInput } from "@dosc-syspro/contracts";

export interface UserAccessCompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

export interface UserAccessEditInitialData {
  name: string;
  email: string;
  role: Role;
  contactId?: string;
  jobTitle: string;
  phone: string;
  cpf: string;
  password: string;
}

export interface ClientUserEditViewData {
  userId: string;
  companies: UserAccessCompanyOption[];
  isAdmin: boolean;
  initialData: UserAccessEditInitialData;
}

export interface SystemUserEditViewData {
  userId: string;
  initialData: UserAccessEditInitialData;
}

export type UserAccessMembershipSummary = {
  companyId: string;
  role: Role;
  company: {
    nomeFantasia: string | null;
    razaoSocial: string;
  };
};

export type UserAccessContactSummary = {
  id: string;
  name: string;
  whatsapp: string | null;
  email: string | null;
  cpf?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  companyId: string | null;
  company: {
    id: string;
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
};

export type UserAccessListItem = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  jobTitle: string | null;
  cpf: string | null;
  phone: string | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  memberships: UserAccessMembershipSummary[];
  contact: UserAccessContactSummary | null;
  companyName: string;
  companyId: string | null;
};

export type SystemUserListItem = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  jobTitle: string | null;
  cpf: string | null;
  phone: string | null;
  memberships: UserAccessMembershipSummary[];
  contact: UserAccessContactSummary | null;
};

export type UserAccessValidationErrors = Partial<Record<keyof CreateUserInput, string[]>>;

export type UserAccessActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type UserAccessActionFailure = {
  success: false;
  message: string;
  errors?: UserAccessValidationErrors;
};

export type UserAccessActionResponse<T = void> = UserAccessActionSuccess<T> | UserAccessActionFailure;
