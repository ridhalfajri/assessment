import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  createSessionToken,
  ADMIN_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password wajib diisi." },
        { status: 400 },
      );
    }

    const isValid = checkAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Password admin salah." },
        { status: 401 },
      );
    }

    const token = createSessionToken();
    const response = NextResponse.json(
      { ok: true, message: "Login admin berhasil." },
      { status: 200 },
    );

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("[admin-login] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal." },
      { status: 500 },
    );
  }
}
