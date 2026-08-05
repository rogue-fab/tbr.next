import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "../../../lib/adminAuth";

export default function DevScroll() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(token)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Sticky Header Visual Check</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        This page is intentionally long so you can confirm the header remains sticky while scrolling.
      </p>
      <section className="space-y-6">
        {Array.from({ length: 60 }).map((_, i) => (
          <p key={i} className="text-gray-700 dark:text-gray-200">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae elit nec
            urna lobortis facilisis. (row {i + 1})
          </p>
        ))}
      </section>
    </main>
  );
}
