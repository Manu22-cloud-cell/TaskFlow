import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CommentsSection } from '@/features/tasks/components/comments-section';
import { TaskActions } from '@/features/tasks/components/task-actions';
import { ProjectRealtimeListener } from '@/features/realtime/components/project-realtime-listener';
import { TaskFlowApiError } from '@/lib/taskflow-api';
import type {
  Comment,
  Project,
  ProjectMember,
  Task,
  TaskActivity,
  User,
} from '@/lib/types';
import { getCurrentUser } from '@/services/server/auth.service';
import {
  getProject,
  getProjectMembers,
} from '@/services/server/projects.service';
import {
  getTask,
  getTaskActivity,
  getTaskComments,
} from '@/services/server/tasks.service';

export default async function TaskDetailsPage(
  context: PageProps<'/tasks/[taskId]'>,
) {
  const { taskId } = await context.params;

  let project: Project;
  let task: Task;
  let comments: Comment[];
  let activity: TaskActivity[];
  let currentUser: User;
  let projectMembers: ProjectMember[];

  try {
    task = await getTask(taskId);
  } catch (error) {
    if (error instanceof TaskFlowApiError) {
      if (error.status === 401) redirect('/login');
      if (error.status === 404) notFound();
    }

    throw error;
  }

  try {
    [project, comments, activity, currentUser, projectMembers] =
      await Promise.all([
        getProject(task.projectId),
        getTaskComments(taskId),
        getTaskActivity(taskId),
        getCurrentUser(),
        getProjectMembers(task.projectId),
      ]);
  } catch (error) {
    if (error instanceof TaskFlowApiError) {
      if (error.status === 401) redirect('/login');
      if (error.status === 404) notFound();
    }

    throw error;
  }

  const canManageProject =
    currentUser.role === 'ADMIN' ||
    project.ownerId === currentUser.id ||
    projectMembers.some(
      (member) =>
        member.user.id === currentUser.id && member.role === 'MANAGER',
    );

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-6xl">
        <ProjectRealtimeListener projectId={project.id} />
        <Link
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          href={`/projects/${project.id}`}
        >
          ← Back to {project.name}
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-indigo-600">Task</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
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
    <aside className="rounded-xl bg-white p-5 shadow-sm">
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
