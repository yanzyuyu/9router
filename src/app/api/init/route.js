import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";

export async function GET() {
  const settings = await getSettings();
  const isConfigured = Boolean(settings.password || process.env.INITIAL_PASSWORD);
  return NextResponse.json({ initialized: isConfigured });
}

export async function POST(request) {
  try {
    const settings = await getSettings();
    const isConfigured = Boolean(settings.password || process.env.INITIAL_PASSWORD);
    if (isConfigured) {
      return NextResponse.json({ error: "Instance is already initialized" }, { status: 400 });
    }

    const body = await request.json();
    const password = String(body.password || "").trim();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await updateSettings({ password: hash });

    const cookieStore = await cookies();
    await setDashboardAuthCookie(cookieStore, request);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to initialize password" }, { status: 500 });
  }
}
