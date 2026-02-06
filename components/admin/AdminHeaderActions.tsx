"use client";

import { useState } from "react";

export default function AdminHeaderActions() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setErr(`Logout failed (${res.status}) ${txt.slice(0, 120)}`);
        return;
      }
      window.location.href = "/admin";
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Logout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {err ? (
        <span className="text-xs text-red-600" title={err}>
          {err}
        </span>
      ) : null}
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className={[
          "rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm",
          busy
            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
            : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
        ].join(" ")}
        title="Log out (clears admin cookie)"
      >
        {busy ? "Logging out…" : "Logout"}
      </button>
    </div>
  );
}
