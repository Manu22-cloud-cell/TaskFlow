'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { exportProjectTasks } from '@/services/client/projects.service';
import { getClientApiError } from '@/lib/client-api';

export function ExportTasksButton({ projectId }: { projectId: number }) {
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadCsv() {
    setIsExporting(true);
    setError(null);

    try {
      const csv = await exportProjectTasks(
        projectId,
        new URLSearchParams(searchParams.toString()),
      );
      const blob = new Blob(['\uFEFF', csv.replace(/^\uFEFF/, '')], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-${projectId}-tasks.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      setError(
        getClientApiError(error, 'Unable to export tasks. Please try again.'),
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <button
        className="button-secondary min-h-0 py-2"
        disabled={isExporting}
        onClick={downloadCsv}
        type="button"
        title="Export all tasks matching the current filters"
      >
        {isExporting ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
