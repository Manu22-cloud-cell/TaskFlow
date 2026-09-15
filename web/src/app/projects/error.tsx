'use client';
export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Unable to load projects</h1>
        <p className="mt-2 text-sm text-slate-600">
          Please check the API connection and try again.
        </p>
        <button
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
