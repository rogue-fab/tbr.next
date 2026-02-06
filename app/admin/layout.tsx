import type { ReactNode } from "react";
import AdminHeaderActions from "../../components/admin/AdminHeaderActions";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              TubeBenderReviews Admin
            </h1>
            <span className="text-xs text-gray-500">
              Scoring overlay editor
            </span>
          </div>
          <AdminHeaderActions />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}



