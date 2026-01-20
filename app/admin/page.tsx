"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  // Canonical admin entry point is /admin/app.
  // /admin/login exists for token setting; /admin should not be a second login UI.
  useEffect(() => {
    router.replace("/admin/app");
  }, [router]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Redirecting…</h2>
      <p className="mt-2 text-xs text-gray-600">
        Sending you to <code className="rounded bg-gray-100 px-1">/admin/app</code>.
      </p>
    </div>
  );
}
