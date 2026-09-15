import Link from 'next/link';
export default function ProjectNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-2 text-slate-600">
          It may not exist or you may not have access to it.
        </p>
        <Link
          className="mt-5 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          href="/projects"
        >
          Back to projects
        </Link>
      </div>
    </main>
  );
}
