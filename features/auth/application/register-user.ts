import type {
  AuthRepository,
  RegisterCredentials,
} from "./auth-credentials";

export async function registerUser(
  repository: AuthRepository,
  credentials: RegisterCredentials,
) {
  return repository.register(credentials);
}
