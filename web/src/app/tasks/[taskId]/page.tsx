'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { ProjectRealtimeListener } from '@/features/realtime/components/project-realtime-listener';
import { CommentsSection } from '@/features/tasks/components/comments-section';
import { TaskActions } from '@/features/tasks/components/task-actions';
import { getClientApiError } from '@/lib/client-api';
import type {
  Comment,
  Project,
  ProjectMember,
  Task,
  TaskActivity,
  User,
} from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import {
  getProject,
  getProjectMembers,
} from '@/services/client/projects.service';
import {
  getTask,
  getTaskActivity,
  getTaskComments,
} from '@/services/client/tasks.service';

export default function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTaskDetails = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const taskResponse = await getTask(taskId);
      const [
        projectResponse,
        commentsResponse,
        activityResponse,
        userResponse,
        membersResponse,
      ] = await Promise.all([
        getProject(taskResponse.projectId),
        getTaskComments(taskId),
        getTaskActivity(taskId),
        getCurrentUser(),
        getProjectMembers(taskResponse.projectId),
      ]);

      setTask(taskResponse);
      setProject(projectResponse);
      setComments(commentsResponse);
      setActivity(activityResponse);
      setCurrentUser(userResponse);
      setProjectMembers(membersResponse);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load this task.'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void Promise.resolve().then(loadTaskDetails);
  }, [loadTaskDetails]);

  if (isLoading) return <TaskState message="Loading task…" />;
  if (error || !project || !task || !currentUser) {
    return <TaskState message={error ?? 'Task not found.'} />;
  }

  const canManageProject =
    currentUser.role === 'ADMIN' ||
    project.ownerId === currentUser.id ||
    projectMembers.some(
      (member) =>
        member.user.id === currentUser.id && member.role === 'MANAGER',
    );

  return (
    <main className="app-page">
      <section className="app-container max-w-6xl">
        <ProjectRealtimeListener
          currentUserId={currentUser.id}
          includeCommentEvents
          onRefresh={loadTaskDetails}
          projectId={project.id}
        />
        <Link
          className="inline-flex items-center rounded-lg text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
          href={`/projects/${project.id}`}
        >
          ← Back to {project.name}
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="panel p-6 sm:p-7">
            <p className="page-kicker">Task</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {task.title}
            </h1>
            <p className="mt-5 whitespace-pre-wrap text-slate-700">
              {task.description ?? 'No description provided.'}
            </p>

            <TaskDetails task={task} />
            {canManageProject && (
              <TaskActions members={projectMembers} task={task} />
            )}
          </section>

          <ActivityTimeline activity={activity} />
        </div>

        <CommentsSection
          canManageProject={canManageProject}
          comments={comments}
          currentUserId={currentUser.id}
          taskId={task.id}
        />
      </section>
    </main>
  );
}

function TaskState({ message }: { message: string }) {
  return (
    <main className="app-page flex min-h-screen items-center justify-center p-6">
      <p className="panel px-6 py-4 text-sm text-slate-600">
        {message}
      </p>
    </main>
  );
}

function TaskDetails({ task }: { task: Task }) {
  return (
    <dl className="mt-8 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
      <DetailItem label="Status" value={formatLabel(task.status)} />
      <DetailItem label="Priority" value={formatLabel(task.priority)} />
      <DetailItem
        label="Assignee"
        value={task.assignee?.name ?? 'Unassigned'}
      />
      <DetailItem
        label="Due date"
        value={task.dueDate ? formatDate(task.dueDate) : 'No due date'}
      />
      <DetailItem label="Position" value={String(task.position + 1)} />
    </dl>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ActivityTimeline({ activity }: { activity: TaskActivity[] }) {
  return (
    <aside className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Activity</h2>

      {activity.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ol className="mt-5 space-y-5 border-l border-slate-200 pl-4">
          {activity.map((event) => (
            <li className="relative" key={event.id}>
              <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-indigo-500" />
              <p className="text-sm text-slate-700">
                <span className="font-medium">{event.actor.name}</span>{' '}
                {describeActivity(event)}
              </p>
              <time className="mt-1 block text-xs text-slate-500">
                {formatDateTime(event.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function describeActivity(event: TaskActivity) {
  const metadata = event.metadata ?? {};

  switch (event.type) {
    case 'TASK_CREATED':
      return 'created this task';
    case 'STATUS_CHANGED':
      return `changed status from ${formatLabel(String(metadata.from))} to ${formatLabel(String(metadata.to))}`;
    case 'ASSIGNEE_CHANGED':
      return 'changed the assignee';
    case 'PRIORITY_CHANGED':
      return `changed priority from ${formatLabel(String(metadata.from))} to ${formatLabel(String(metadata.to))}`;
    case 'DUE_DATE_CHANGED':
      return 'changed the due date';
    case 'COMMENT_ADDED':
      return 'added a comment';
  }
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
