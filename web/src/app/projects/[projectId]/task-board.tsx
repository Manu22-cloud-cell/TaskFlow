'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { TaskCard } from './task-card';
import { getClientApiError } from '@/lib/client-api';
import type { Task, TaskStatus } from '@/lib/types';
import {
  moveTask as moveTaskRequest,
  updateTaskStatus,
} from '@/services/client/tasks.service';

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'TODO', title: 'To do' },
  { status: 'IN_PROGRESS', title: 'In progress' },
  { status: 'COMPLETED', title: 'Completed' },
  { status: 'CANCELLED', title: 'Cancelled' },
];

type TasksByStatus = Record<TaskStatus, Task[]>;

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function taskId(task: Task) {
  return `task-${task.id}`;
}

function createBoard(tasks: Task[]): TasksByStatus {
  return columns.reduce<TasksByStatus>(
    (board, column) => ({
      ...board,
      [column.status]: tasks
        .filter((task) => task.status === column.status)
        .sort((first, second) => first.position - second.position),
    }),
    { TODO: [], IN_PROGRESS: [], COMPLETED: [], CANCELLED: [] },
  );
}

function getTaskId(value: string) {
  return Number(value.replace('task-', ''));
}

export function TaskBoard({
  tasks,
  currentUserId,
  canManageTasks,
}: {
  tasks: Task[];
  currentUserId: number;
  canManageTasks: boolean;
}) {
  const router = useRouter();
  const [board, setBoard] = useState<TasksByStatus>(() => createBoard(tasks));
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findTask(taskIdentifier: string) {
    const id = getTaskId(taskIdentifier);

    return columns
      .flatMap((column) => board[column.status])
      .find((task) => task.id === id);
  }

  function findTaskStatus(taskIdentifier: string): TaskStatus | undefined {
    const id = getTaskId(taskIdentifier);

    return columns.find((column) =>
      board[column.status].some((task) => task.id === id),
    )?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    setToast(null);
    setActiveTask(findTask(String(event.active.id)) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    if (!overId || isSaving) return;

    const sourceStatus = findTaskStatus(activeId);
    const task = findTask(activeId);
    const targetStatus = columns.some((column) => column.status === overId)
      ? (overId as TaskStatus)
      : findTaskStatus(overId);

    if (!task || !sourceStatus || !targetStatus) return;

    const sourceIndex = board[sourceStatus].findIndex(
      (candidate) => candidate.id === task.id,
    );
    const targetIndex =
      overId === targetStatus
        ? board[targetStatus].length
        : board[targetStatus].findIndex(
            (candidate) => taskId(candidate) === overId,
          );

    if (targetIndex < 0) return;

    const previousBoard = board;
    const nextBoard = moveTask(
      board,
      task,
      sourceStatus,
      targetStatus,
      sourceIndex,
      targetIndex,
    );

    setBoard(nextBoard);
    setIsSaving(true);

    try {
      await moveTaskRequest(task.id, targetStatus, targetIndex);

      router.refresh();
    } catch (error) {
      setBoard(previousBoard);
      setToast(
        getClientApiError(
          error,
          'Unable to move task. The board was restored.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(task: Task, targetStatus: TaskStatus) {
    const sourceStatus = findTaskStatus(taskId(task));

    if (!sourceStatus || sourceStatus === targetStatus || isSaving) return;

    const sourceIndex = board[sourceStatus].findIndex(
      (candidate) => candidate.id === task.id,
    );
    const targetIndex = board[targetStatus].length;
    const previousBoard = board;
    const nextBoard = moveTask(
      board,
      task,
      sourceStatus,
      targetStatus,
      sourceIndex,
      targetIndex,
    );

    setToast(null);
    setBoard(nextBoard);
    setIsSaving(true);

    try {
      await updateTaskStatus(task.id, targetStatus);

      router.refresh();
    } catch (error) {
      setBoard(previousBoard);
      setToast(
        getClientApiError(
          error,
          'Unable to update task status. The board was restored.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {toast && (
        <div
          className="fixed right-6 top-6 z-50 max-w-sm rounded-lg bg-red-700 px-4 py-3 text-sm text-white shadow-lg"
          role="alert"
        >
          {toast}
        </div>
      )}

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map((column) => (
            <TaskColumn
              canManageTasks={canManageTasks}
              currentUserId={currentUserId}
              isSaving={isSaving}
              key={column.status}
              onStatusChange={handleStatusChange}
              status={column.status}
              tasks={board[column.status]}
              title={column.title}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function moveTask(
  board: TasksByStatus,
  task: Task,
  sourceStatus: TaskStatus,
  targetStatus: TaskStatus,
  sourceIndex: number,
  targetIndex: number,
): TasksByStatus {
  if (sourceStatus === targetStatus) {
    return {
      ...board,
      [sourceStatus]: arrayMove(board[sourceStatus], sourceIndex, targetIndex),
    };
  }

  return {
    ...board,
    [sourceStatus]: board[sourceStatus].filter(
      (candidate) => candidate.id !== task.id,
    ),
    [targetStatus]: [
      ...board[targetStatus].slice(0, targetIndex),
      { ...task, status: targetStatus },
      ...board[targetStatus].slice(targetIndex),
    ],
  };
}

function TaskColumn({
  status,
  title,
  tasks,
  isSaving,
  currentUserId,
  canManageTasks,
  onStatusChange,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  isSaving: boolean;
  currentUserId: number;
  canManageTasks: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      className={`rounded-xl p-3 transition-colors ${
        isOver ? 'bg-indigo-100 ring-2 ring-indigo-300' : 'bg-slate-200/70'
      }`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map(taskId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 space-y-3">
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
              Drop tasks here
            </p>
          ) : (
            tasks.map((task) => (
              <TaskInColumn
                canManageTasks={canManageTasks}
                currentUserId={currentUserId}
                disabled={isSaving}
                key={task.id}
                onStatusChange={onStatusChange}
                task={task}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskInColumn({
  task,
  disabled,
  currentUserId,
  canManageTasks,
  onStatusChange,
}: {
  task: Task;
  disabled: boolean;
  currentUserId: number;
  canManageTasks: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  if (canManageTasks) {
    return <SortableTaskCard disabled={disabled} task={task} />;
  }

  const canChangeStatus = task.assignedToId === currentUserId;

  return (
    <TaskCard task={task}>
      {canChangeStatus && (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Status
          <select
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            disabled={disabled}
            onChange={(event) =>
              onStatusChange(task, event.target.value as TaskStatus)
            }
            value={task.status}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
    </TaskCard>
  );
}

function SortableTaskCard({
  task,
  disabled,
}: {
  task: Task;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: taskId(task), disabled });

  return (
    <div
      className={isDragging ? 'opacity-30' : undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} />
    </div>
  );
}
