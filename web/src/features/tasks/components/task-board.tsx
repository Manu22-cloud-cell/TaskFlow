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
import { moveTask as moveTaskRequest } from '@/services/client/tasks.service';

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'TODO', title: 'To do' },
  { status: 'IN_PROGRESS', title: 'In progress' },
  { status: 'COMPLETED', title: 'Completed' },
  { status: 'CANCELLED', title: 'Cancelled' },
];

type TasksByStatus = Record<TaskStatus, Task[]>;

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

export function TaskBoard({ tasks }: { tasks: Task[] }) {
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
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[900px] gap-4 lg:grid-cols-4">
            {columns.map((column) => (
              <TaskColumn
                isSaving={isSaving}
                key={column.status}
                status={column.status}
                tasks={board[column.status]}
                title={column.title}
              />
            ))}
          </div>
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
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  isSaving: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      className={`rounded-2xl border p-3 transition-colors ${
        isOver
          ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
          : 'border-slate-200 bg-slate-100/80'
      }`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map(taskId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-28 space-y-3">
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              Drop tasks here
            </p>
          ) : (
            tasks.map((task) => (
              <TaskInColumn disabled={isSaving} key={task.id} task={task} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskInColumn({ task, disabled }: { task: Task; disabled: boolean }) {
  return <SortableTaskCard disabled={disabled} task={task} />;
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
