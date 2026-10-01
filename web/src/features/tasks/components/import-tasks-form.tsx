'use client';

import { useState } from 'react';
import { getClientApiError } from '@/lib/client-api';
import { toast } from '@/features/ui/components/toast-provider';
import {
  importTasks,
  previewTaskImport,
  type TaskImportPreview,
} from '@/services/client/tasks.service';

export function ImportTasksForm({
  projectId,
  onImported,
}: {
  projectId: number;
  onImported: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<TaskImportPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  async function readFile(file: File | undefined) {
    setCsv('');
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > 50_000) {
      setError('Choose a CSV file no larger than 50 KB.');
      return;
    }
    setIsBusy(true);
    try {
      setCsv(await file.text());
    } catch {
      setError('Unable to read this file.');
    } finally {
      setIsBusy(false);
    }
  }

  async function validate() {
    setIsBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await previewTaskImport(projectId, csv));
    } catch (error) {
      setError(getClientApiError(error, 'Unable to preview the CSV.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function confirm() {
    if (!preview?.valid || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await importTasks(projectId, csv);
      setCsv('');
      setPreview(null);
      setFileKey((key) => key + 1);
      setIsOpen(false);
      toast.success(`Imported ${result.importedCount} tasks.`);
      onImported();
    } catch (error) {
      setPreview(null);
      setError(
        getClientApiError(
          error,
          'Import failed. Preview again before retrying.',
        ),
      );
    } finally {
      setIsBusy(false);
    }
  }

  function downloadTemplate() {
    const text =
      'Title,Description,Status,Priority,Assignee email,Due date\r\nExample task,Replace this example,TODO,MEDIUM,,\r\n';
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'task-import-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="mb-6">
      <button
        className="button-secondary"
        type="button"
        disabled={isBusy}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        Import CSV
      </button>
      {isOpen && (
        <div className="panel mt-3 space-y-4 p-5">
          <h2 className="text-lg font-semibold">Import tasks</h2>
          <p className="text-sm text-slate-600">
            Upload up to 100 tasks (50 KB). Every row creates a new task; Task
            IDs are ignored. Reimporting a file creates duplicates. Blank status
            defaults to TODO and blank priority to MEDIUM.
          </p>
          <p className="text-sm text-slate-600">
            Use project member emails for assignees and YYYY-MM-DD or ISO
            timestamps for due dates. Leave either blank if unset.
          </p>
          <button
            className="button-secondary"
            onClick={downloadTemplate}
            type="button"
          >
            Download template
          </button>
          <label className="block text-sm font-medium">
            CSV file
            <input
              key={fileKey}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              type="file"
              accept=".csv,text/csv"
              disabled={isBusy}
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
          </label>
          <button
            className="button-secondary"
            disabled={!csv || isBusy}
            type="button"
            onClick={validate}
          >
            {isBusy ? 'Processing…' : 'Preview and validate'}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {preview && (
            <>
              <p className="text-sm" role="status">
                {preview.rows.length} tasks.{' '}
                {preview.valid
                  ? 'Ready to import.'
                  : 'Fix the errors in your file, select it again, and preview.'}
              </p>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        'Row',
                        'Title / description',
                        'Status / priority',
                        'Assignee / due date',
                        'Validation',
                      ].map((title) => (
                        <th key={title} className="p-2">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.row} className="border-t border-slate-200">
                        <td className="p-2">{row.row}</td>
                        <td className="max-w-xs break-words p-2">
                          {row.title}
                          <p className="whitespace-pre-wrap text-xs text-slate-500">
                            {row.description}
                          </p>
                        </td>
                        <td className="p-2">
                          {row.status}
                          <br />
                          {row.priority}
                        </td>
                        <td className="p-2">
                          {row.assigneeEmail || 'Unassigned'}
                          <br />
                          {row.dueDate || 'No due date'}
                        </td>
                        <td className="p-2">
                          {row.errors.length ? (
                            <ul className="text-red-700">
                              {row.errors.map((message) => (
                                <li key={message}>{message}</li>
                              ))}
                            </ul>
                          ) : (
                            'Valid'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="button-primary"
                disabled={!preview.valid || isBusy}
                onClick={confirm}
                type="button"
              >
                {isBusy
                  ? 'Importing…'
                  : `Confirm import of ${preview.rows.length} tasks`}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
