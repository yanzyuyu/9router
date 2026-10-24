import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";

export default async function InitPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const isAuthed = token ? await verifyDashboardAuthToken(token) : false;
  if (isAuthed) {
    redirect("/dashboard");
  }
  redirect("/login");
}
