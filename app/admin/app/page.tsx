import AdminClient from "../_client/AdminClient";

export default function AdminAppPage() {
  // AdminClient is a client component; app router can render it from here.
  return (
    <>
      <AdminClient />
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-[11px] text-gray-400">
        Build:{" "}
        <span className="font-mono">
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
            process.env.VERCEL_GIT_COMMIT_SHA ??
            "unknown"}
        </span>
      </div>
    </>
  );
}

