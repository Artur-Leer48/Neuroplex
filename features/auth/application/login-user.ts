import type {
  AuthRepository,
  LoginCredentials,
} from "./auth-credentials";

export async function loginUser(
  repository: AuthRepository,
  credentials: LoginCredentials,
) {
  return repository.login(credentials);
}
