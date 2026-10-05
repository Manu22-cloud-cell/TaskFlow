import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthenticatedUser,
  ProjectAccessService,
} from '../projects/project-access.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { TaskActivityType } from '../generated/prisma/enums.js';
import { parseTaskCsv } from './task-csv.js';

@Injectable()
export class TaskImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async preview(projectId: number, csv: string, requester: AuthenticatedUser) {
    await this.access.assertCanManageProject(projectId, requester);
    const rows = parseTaskCsv(csv);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true, user: { select: { email: true } } },
    });
    const ids = new Map(
      members.map((member) => [member.user.email.toLowerCase(), member.userId]),
    );
    const resolved = rows.map((row) => {
      const assignedToId = row.assigneeEmail
        ? ids.get(row.assigneeEmail.toLowerCase())
        : undefined;
      if (row.assigneeEmail && assignedToId === undefined)
        row.errors.push(
          'Assignee email must match an existing project member.',
        );
      return { ...row, assignedToId };
    });
    return {
      rows: resolved,
      valid: resolved.every((row) => row.errors.length === 0),
    };
  }

  async import(projectId: number, csv: string, requester: AuthenticatedUser) {
    // Revalidate at confirmation; never trust a browser's earlier preview.
    const preview = await this.preview(projectId, csv, requester);
    if (!preview.valid)
      throw new BadRequestException(
        preview.rows.flatMap((row) =>
          row.errors.map((error) => `Row ${row.row}: ${error}`),
        ),
      );

    const tasks = await this.prisma
      .$transaction(
        async (tx) => {
          const positions = new Map<string, number>();
          const created: { id: number }[] = [];
          for (const row of preview.rows) {
            if (row.assignedToId !== undefined) {
              const membership = await tx.projectMember.findUnique({
                where: {
                  projectId_userId: { projectId, userId: row.assignedToId },
                },
              });
              if (!membership)
                throw new BadRequestException(
                  `Row ${row.row}: Assignee is no longer a project member.`,
                );
            }
            if (!positions.has(row.status)) {
              const last = await tx.task.aggregate({
                where: { projectId, status: row.status },
                _max: { position: true },
              });
              positions.set(row.status, (last._max.position ?? -1) + 1);
            }
            const position = positions.get(row.status)!;
            const task = await tx.task.create({
              data: {
                projectId,
                title: row.title,
                description: row.description || null,
                status: row.status,
                priority: row.priority,
                assignedToId: row.assignedToId,
                dueDate: row.dueDate ? new Date(row.dueDate) : null,
                position,
              },
              select: { id: true },
            });
            await tx.taskActivity.create({
              data: {
                taskId: task.id,
                actorId: requester.sub,
                type: TaskActivityType.TASK_CREATED,
              },
            });
            positions.set(row.status, position + 1);
            created.push(task);
          }
          return created;
        },
        { isolationLevel: 'Serializable', timeout: 30_000 },
      )
      .catch((error: unknown) => {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2034'
        ) {
          throw new ConflictException(
            'The board changed during import. Preview the file again and retry. No tasks were imported.',
          );
        }
        throw error;
      });

    // One event refreshes the project without flooding other users with popups.
    const notificationId = this.realtime.emitTaskEvent(
      projectId,
      'task.created',
      tasks[0].id,
      requester.sub,
    );
    const assignees = new Set(preview.rows.map((row) => row.assignedToId));
    for (const userId of assignees) {
      if (userId !== undefined) {
        this.realtime.emitDesktopNotification(
          userId,
          requester.sub,
          'New imported tasks were assigned to you.',
          `/projects/${projectId}`,
          notificationId,
        );
      }
    }
    return { importedCount: tasks.length };
  }
}
