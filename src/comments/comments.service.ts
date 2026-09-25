import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskActivityType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthenticatedUser,
  ProjectAccessService,
} from '../projects/project-access.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { ListTaskFeedDto } from './dto/list-task-feed.dto.js';

type TaskFeedPage<T> = {
  data: T[];
  meta: {
    limit: number;
    nextCursor: number | null;
    hasNextPage: boolean;
  };
};

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

  private assertIsCommentAuthor(
    comment: { authorId: number },
    user: AuthenticatedUser,
  ) {
    if (comment.authorId !== user.sub) {
      throw new ForbiddenException('Only the comment author can modify it');
    }
  }

  async findAll(
    taskId: number,
    pagination: ListTaskFeedDto,
    user: AuthenticatedUser,
  ) {
    await this.taskForView(taskId, user);
    const limit = pagination.limit ?? 20;
    const comments = await this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(pagination.cursor && {
        cursor: { id: pagination.cursor },
        skip: 1,
      }),
      take: limit + 1,
    });

    return this.toFeedPage(comments, limit);
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
    this.assertIsCommentAuthor(comment, user);
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
    this.assertIsCommentAuthor(comment, user);
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
  async activity(
    taskId: number,
    pagination: ListTaskFeedDto,
    user: AuthenticatedUser,
  ) {
    await this.taskForView(taskId, user);
    const limit = pagination.limit ?? 20;
    const activity = await this.prisma.taskActivity.findMany({
      where: { taskId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(pagination.cursor && {
        cursor: { id: pagination.cursor },
        skip: 1,
      }),
      take: limit + 1,
    });

    return this.toFeedPage(activity, limit);
  }

  private toFeedPage<T extends { id: number }>(
    records: T[],
    limit: number,
  ): TaskFeedPage<T> {
    const hasNextPage = records.length > limit;
    const data = hasNextPage ? records.slice(0, limit) : records;

    return {
      data,
      meta: {
        limit,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
        hasNextPage,
      },
    };
  }
}
