export default function ProjectsLoading() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-6xl animate-pulse">
        <div className="h-8 w-32 rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((id) => (
            <div className="h-40 rounded-xl bg-white" key={id} />
          ))}
        </div>
      </section>
    </main>
  );
}
