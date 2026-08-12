import type { CSSProperties, ReactNode } from "react";
import AdminHeaderActions from "../../components/admin/AdminHeaderActions";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // The admin is nested inside the public site's centered <main> (max-w-6xl).
  // Break out to ~96vw so the editor can use nearly the full display width on
  // large monitors. 96vw (not 100vw) keeps a 2vw gutter that absorbs the
  // scrollbar, so there is NO horizontal page scroll. Inline styles are used for
  // the break-out to avoid any Tailwind calc() parsing ambiguity.
  const fullBleed: CSSProperties = {
    width: "96vw",
    marginLeft: "calc(50% - 48vw)",
    marginRight: "calc(50% - 48vw)",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div
          style={fullBleed}
          className="flex items-center justify-between px-4 py-3"
        >
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
      <main style={fullBleed} className="px-4 py-8">
        {children}
      </main>
    </div>
  );
}



