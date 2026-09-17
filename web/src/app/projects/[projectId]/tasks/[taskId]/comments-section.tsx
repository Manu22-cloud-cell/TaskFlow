'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientApi, getClientApiError } from '@/lib/client-api';
import type { Comment } from '@/lib/types';

export function CommentsSection({
  comments,
  taskId,
  currentUserId,
  canManageProject,
}: {
  comments: Comment[];
  taskId: number;
  currentUserId: number;
  canManageProject: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await clientApi.post(`/tasks/${taskId}/comments`, {
        content: content.trim(),
      });

      setContent('');
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create the comment.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateComment(commentId: number) {
    if (!editingContent.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await clientApi.patch(`/tasks/${taskId}/comments/${commentId}`, {
        content: editingContent.trim(),
      });

      setEditingCommentId(null);
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to update the comment.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteComment(commentId: number) {
    if (isSaving || !window.confirm('Delete this comment?')) return;

    setError(null);
    setIsSaving(true);

    try {
      await clientApi.delete(`/tasks/${taskId}/comments/${commentId}`);

      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to delete the comment.'));
    } finally {
      setIsSaving(false);
    }
  }

  function beginEditing(comment: Comment) {
    setError(null);
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Comments</h2>

      <form className="mt-4" onSubmit={createComment}>
        <label className="sr-only" htmlFor="new-comment">
          Add a comment
        </label>
        <textarea
          className="min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          id="new-comment"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add a comment…"
          value={content}
        />
        <button
          className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || !content.trim()}
          type="submit"
        >
          {isSaving ? 'Saving…' : 'Add comment'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-5">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet.</p>
        ) : (
          comments.map((comment) => {
            const canModify =
              comment.authorId === currentUserId || canManageProject;
            const isEditing = editingCommentId === comment.id;

            return (
              <article
                className="border-t border-slate-200 pt-5"
                key={comment.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">
                    {comment.author.name}
                  </p>
                  <time className="text-xs text-slate-500">
                    {formatDateTime(comment.createdAt)}
                  </time>
                </div>

                {isEditing ? (
                  <div className="mt-3">
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      onChange={(event) =>
                        setEditingContent(event.target.value)
                      }
                      value={editingContent}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                        disabled={isSaving || !editingContent.trim()}
                        onClick={() => updateComment(comment.id)}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                        disabled={isSaving}
                        onClick={() => setEditingCommentId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {comment.content}
                  </p>
                )}

                {canModify && !isEditing && (
                  <div className="mt-3 flex gap-3">
                    <button
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => beginEditing(comment)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                      onClick={() => deleteComment(comment.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
