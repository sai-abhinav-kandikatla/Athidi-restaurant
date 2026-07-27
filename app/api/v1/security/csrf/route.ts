import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get("csrf_token")?.value;

  if (!token) {
    token = crypto.randomUUID();
  }

  const response = NextResponse.json({
    data: { token },
  });

  response.cookies.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
