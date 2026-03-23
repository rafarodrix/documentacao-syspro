"use server";

import { Role } from "@prisma/client";
import type { CreateUserInput } from "@dosc-syspro/contracts";
import {
  createUserAction as createUserActionImpl,
  updateUserAction as updateUserActionImpl,
  getUsersAction as getUsersActionImpl,
  deleteUserAction as deleteUserActionImpl,
  linkUserToCompanyAction as linkUserToCompanyActionImpl,
  toggleUserStatusAction as toggleUserStatusActionImpl,
  removeUserFromCompanyAction as removeUserFromCompanyActionImpl,
  updateMembershipRoleAction as updateMembershipRoleActionImpl,
} from "@/features/user-access/application/actions";

type ActionResponse<T = any> = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
};

type LinkUserInput = {
  email: string;
  role: Role;
  companyId: string;
};

interface GetUsersParams {
  search?: string;
  role?: string;
}

type UserUpsertInput = CreateUserInput & {
  additionalCompanyIds?: string[];
};

export async function getUsersAction(filters?: GetUsersParams): Promise<ActionResponse> {
  return getUsersActionImpl(filters);
}

export async function createUserAction(data: UserUpsertInput): Promise<ActionResponse> {
  return createUserActionImpl(data);
}

export async function updateUserAction(id: string, data: Partial<UserUpsertInput>): Promise<ActionResponse> {
  return updateUserActionImpl(id, data);
}

export async function deleteUserAction(id: string): Promise<ActionResponse> {
  return deleteUserActionImpl(id);
}

export async function linkUserToCompanyAction(data: LinkUserInput): Promise<ActionResponse> {
  return linkUserToCompanyActionImpl(data);
}

export async function toggleUserStatusAction(id: string, active: boolean): Promise<ActionResponse> {
  return toggleUserStatusActionImpl(id, active);
}

export async function removeUserFromCompanyAction(userId: string, companyId: string): Promise<ActionResponse> {
  return removeUserFromCompanyActionImpl(userId, companyId);
}

export async function updateMembershipRoleAction(userId: string, companyId: string, role: Role): Promise<ActionResponse> {
  return updateMembershipRoleActionImpl(userId, companyId, role);
}
