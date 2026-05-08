export type ContactActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type ContactActionFailure = {
  success: false;
  message: string;
};

export type ContactActionResponse<T = void> = ContactActionSuccess<T> | ContactActionFailure;
