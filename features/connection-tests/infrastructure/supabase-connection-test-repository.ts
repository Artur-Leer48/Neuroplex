import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConnectionTestRepository } from "../application/get-connection-tests";
import type { ConnectionTest } from "../domain/connection-test";

type ConnectionTestRow = {
  id: number;
  title: string;
  status: string;
  created_at: string;
};

export class SupabaseConnectionTestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseConnectionTestError";
  }
}

export class SupabaseConnectionTestRepository
  implements ConnectionTestRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findAll(): Promise<ConnectionTest[]> {
    const { data, error } = await this.supabase
      .from("connection_tests")
      .select("id,title,status,created_at")
      .order("id", { ascending: true });

    if (error) {
      throw new SupabaseConnectionTestError(error.message, error.code);
    }

    return (data ?? []).map(mapConnectionTestRow);
  }
}

function mapConnectionTestRow(row: ConnectionTestRow): ConnectionTest {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  };
}
