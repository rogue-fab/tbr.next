"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Login failed");
        return;
      }

      setStatus("ok");
      setMessage("Logged in. Redirecting to the admin app…");
      // Route into the new AdminClient UI (Save Draft / Publish).
      router.push("/admin/app");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Unexpected error logging in",
      );
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">
        Admin login
      </h2>
      <p className="mt-2 text-xs text-gray-600">
        Enter the shared admin token. If it matches{" "}
        <code className="rounded bg-gray-100 px-1">
          ADMIN_TOKEN
        </code>{" "}
        on the server, we&apos;ll set an{" "}
        <code className="rounded bg-gray-100 px-1">
          admin_token
        </code>{" "}
        cookie and you can edit product overlays.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Admin token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !token}
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {status === "loading" ? "Checking…" : "Log in"}
        </button>
      </form>

      <div className="mt-4 border-t border-dashed pt-4 text-xs text-gray-600">
        <p className="font-medium text-gray-800">Next step:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-4">
          <li>Log in with the token.</li>
          <li>
            After login you'll be sent to{" "}
            <code className="rounded bg-gray-100 px-1">
              /admin/app
            </code>{" "}
            (new Save Draft / Publish workflow).
          </li>
        </ol>
      </div>

      {message && (
        <p
          className={`mt-4 text-xs ${
            status === "ok" ? "text-green-700" : "text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      {status === "ok" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/app"
            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Open admin app
          </Link>
          <Link
            href="/admin/products"
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
          >
            Open legacy overlay editor
          </Link>
        </div>
      )}
    </div>
  );
}
