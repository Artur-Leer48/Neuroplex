import type { AuthUser } from "../domain/auth-user";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = LoginCredentials & {
  name: string;
};

export type AuthResult = {
  user: AuthUser | null;
  message: string;
};

export type AuthRepository = {
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (credentials: RegisterCredentials) => Promise<AuthResult>;
};
