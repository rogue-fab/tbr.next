import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminClient from "../_client/AdminClient";

export default function AdminAppPage() {
  // Hard gate: if no admin_token cookie, force login.
  // This prevents the confusing "admin app loads but API 401s" situation.
  const hasToken = cookies().has("admin_token");
  if (!hasToken) {
    redirect("/admin/login");
  }

  return <AdminClient />;
}

