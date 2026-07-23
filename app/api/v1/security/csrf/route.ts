import { createCsrfResponse } from "@/app/lib/api/security";

export const dynamic = "force-dynamic";

export function GET() {
  return createCsrfResponse();
}

