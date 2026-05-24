import { NextResponse } from "next/server";

import { getConnectionTests } from "@/features/connection-tests/application/get-connection-tests";
import {
  SupabaseConnectionTestError,
  SupabaseConnectionTestRepository,
} from "@/features/connection-tests/infrastructure/supabase-connection-test-repository";
import { supabase } from "@/lib/supabase";

const connectionTestRepository = new SupabaseConnectionTestRepository(supabase);

export async function GET() {
  try {
    const data = await getConnectionTests(connectionTestRepository);

    return NextResponse.json({
      connected: true,
      data,
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        data: null,
        error: formatConnectionTestError(error),
      },
      { status: 500 },
    );
  }
}

function formatConnectionTestError(error: unknown) {
  if (error instanceof SupabaseConnectionTestError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    message: "Unexpected error while testing the Supabase connection.",
  };
}
