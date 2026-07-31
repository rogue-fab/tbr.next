import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminClient from "../_client/AdminClient";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "../../../lib/adminAuth";

export default function AdminAppPage() {
  // Hard gate: require a VALID admin session cookie, not just its presence.
  // This prevents the confusing "admin app loads but API 401s" situation.
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(token)) {
    redirect("/admin/login");
  }

  return <AdminClient />;
}

