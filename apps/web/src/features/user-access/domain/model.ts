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
  companyId?: string;
  additionalCompanyIds?: string[];
  primaryContactId?: string;
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
  companyId: string;
  contactId: string;
  isPrimary: boolean;
  contact: {
    id: string;
    name: string;
    whatsapp: string | null;
    email: string | null;
  };
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
  contactLinks: UserAccessContactSummary[];
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
  contactLinks: UserAccessContactSummary[];
};

export type UserAccessValidationErrors = Partial<Record<keyof CreateUserInput | "additionalCompanyIds", string[]>>;

export type UserAccessActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type UserAccessActionFailure = {
  success: false;
  message: string;
  errors?: UserAccessValidationErrors;
};

export type UserAccessActionResponse<T = void> = UserAccessActionSuccess<T> | UserAccessActionFailure;
