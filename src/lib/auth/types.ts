export type SignInState = { error: string | null };

export const initialSignInState: SignInState = { error: null };

export type ChangePasswordState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

export const initialChangePasswordState: ChangePasswordState = { status: "idle", message: null };
