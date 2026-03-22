export interface UserAccessCompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

export interface UserAccessEditInitialData {
  name: string;
  email: string;
  role: string;
  companyId?: string;
  additionalCompanyIds?: string[];
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
