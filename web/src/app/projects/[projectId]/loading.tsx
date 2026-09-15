export default function ProjectBoardLoading() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-[1600px] animate-pulse">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((id) => (
            <div className="h-96 rounded-xl bg-slate-200" key={id} />
          ))}
        </div>
      </div>
    </main>
  );
}
