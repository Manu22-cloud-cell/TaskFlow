'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function BoardPagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-slate-600">
        {total} {total === 1 ? 'task' : 'tasks'} total
      </p>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          type="button"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
