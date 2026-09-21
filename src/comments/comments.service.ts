import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskActivityType, UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthenticatedUser,
  ProjectAccessService,
} from '../projects/project-access.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private async taskForView(taskId: number, user: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.assertCanViewProject(task.projectId, user);
    return task;
  }

  async findAll(taskId: number, user: AuthenticatedUser) {
    await this.taskForView(taskId, user);
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(taskId: number, content: string, user: AuthenticatedUser) {
    const task = await this.taskForView(taskId, user);
    const comment = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { taskId, authorId: user.sub, content },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      await tx.taskActivity.create({
        data: {
          taskId,
          actorId: user.sub,
          type: TaskActivityType.COMMENT_ADDED,
          metadata: { commentId: comment.id },
        },
      });
      return comment;
    });
    this.realtime.emitCommentEvent(
      task.projectId,
      'comment.created',
      taskId,
      comment.id,
      user.sub,
    );
    return comment;
  }
  async update(
    taskId: number,
    commentId: number,
    content: string,
    user: AuthenticatedUser,
  ) {
    const task = await this.taskForView(taskId, user);
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.taskId !== taskId)
      throw new NotFoundException('Comment not found');
    if (comment.authorId !== user.sub && user.role !== UserRole.ADMIN)
      await this.access.assertCanManageProject(task.projectId, user);
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
    });
    this.realtime.emitCommentEvent(
      task.projectId,
      'comment.updated',
      taskId,
      commentId,
      user.sub,
    );
    return updatedComment;
  }
  async remove(taskId: number, commentId: number, user: AuthenticatedUser) {
    const task = await this.taskForView(taskId, user);
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.taskId !== taskId)
      throw new NotFoundException('Comment not found');
    if (comment.authorId !== user.sub && user.role !== UserRole.ADMIN)
      await this.access.assertCanManageProject(task.projectId, user);
    await this.prisma.comment.delete({ where: { id: commentId } });
    this.realtime.emitCommentEvent(
      task.projectId,
      'comment.deleted',
      taskId,
      commentId,
      user.sub,
    );
    return { message: 'Comment deleted successfully' };
  }
  async activity(taskId: number, user: AuthenticatedUser) {
    await this.taskForView(taskId, user);
    return this.prisma.taskActivity.findMany({
      where: { taskId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
