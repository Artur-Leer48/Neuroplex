import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuthRepository,
  AuthResult,
  LoginCredentials,
  RegisterCredentials,
} from "../application/auth-credentials";

export class SupabaseAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAuthError";
  }
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email ?? null,
          }
        : null,
      message: "Login erfolgreich.",
    };
  }

  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
      },
    });

    if (error) {
      throw new SupabaseAuthError(error.message);
    }

    return {
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email ?? null,
          }
        : null,
      message: data.session
        ? "Account erstellt und eingeloggt."
        : "Account erstellt. Bitte bestaetige deine E-Mail.",
    };
  }
}
