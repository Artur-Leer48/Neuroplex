import type { ConnectionTest } from "../domain/connection-test";

export type ConnectionTestRepository = {
  findAll: () => Promise<ConnectionTest[]>;
};

export async function getConnectionTests(
  repository: ConnectionTestRepository,
) {
  return repository.findAll();
}
