import type { CreateUserInput, UpdateUserInput } from "@dosc-syspro/contracts/user";

export type UserAccessValidationErrors = Partial<Record<keyof (CreateUserInput & UpdateUserInput), string[]>>;

export type UserAccessActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type UserAccessActionFailure = {
  success: false;
  message: string;
  errors?: UserAccessValidationErrors;
};

export type UserAccessActionResponse<T = void> = UserAccessActionSuccess<T> | UserAccessActionFailure;
