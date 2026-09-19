export default function TaskDetailsLoading() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-96 rounded-xl bg-slate-200" />
          <div className="h-96 rounded-xl bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
