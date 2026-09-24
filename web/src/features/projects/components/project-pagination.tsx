'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PaginationMeta } from '@/lib/types';

export function ProjectPagination({ meta }: { meta: PaginationMeta }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (meta.totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (page === 1) params.delete('page');
    else params.set('page', String(page));

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="panel mt-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <p className="text-sm text-slate-600">
        Page {meta.page} of {meta.totalPages}
      </p>
      <div className="flex items-center gap-3">
        <button
          className="button-secondary min-h-0 px-3 py-1.5"
          disabled={meta.page <= 1}
          onClick={() => goToPage(meta.page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="button-secondary min-h-0 px-3 py-1.5"
          disabled={meta.page >= meta.totalPages}
          onClick={() => goToPage(meta.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
