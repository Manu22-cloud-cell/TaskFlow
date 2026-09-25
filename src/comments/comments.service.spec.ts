import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ForbiddenException } from '@nestjs/common';

import { UserRole } from '../generated/prisma/enums.js';
import { CommentsService } from './comments.service.js';

describe('CommentsService', () => {
  const member = {
    sub: 3,
    email: 'member@example.com',
    role: UserRole.MEMBER,
  };
  const admin = {
    sub: 1,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };
  const task = { id: 45, projectId: 12 };
  const mockPrisma = {
    task: { findUnique: jest.fn() },
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    taskActivity: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockAccess = {
    assertCanViewProject: jest.fn(),
    assertCanManageProject: jest.fn(),
  };
  const mockRealtime = { emitCommentEvent: jest.fn() };

  let service: CommentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) =>
      callback(mockPrisma),
    );
    mockPrisma.task.findUnique.mockResolvedValue(task);
    service = new CommentsService(
      mockPrisma as any,
      mockAccess as any,
      mockRealtime as any,
    );
  });

  it('emits a project-room event after creating a comment and activity record', async () => {
    mockPrisma.comment.create.mockResolvedValue({ id: 9, taskId: task.id });

    await service.create(task.id, 'Looks good', member);

    expect(mockAccess.assertCanViewProject).toHaveBeenCalledWith(
      task.projectId,
      member,
    );
    expect(mockPrisma.taskActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskId: task.id, actorId: member.sub }),
      }),
    );
    expect(mockRealtime.emitCommentEvent).toHaveBeenCalledWith(
      task.projectId,
      'comment.created',
      task.id,
      9,
      member.sub,
    );
  });

  it('returns newest comments first with a cursor for the next page', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([
      { id: 5, content: 'Newest' },
      { id: 4, content: 'Middle' },
      { id: 3, content: 'Older' },
    ]);

    await expect(
      service.findAll(task.id, { limit: 2 }, member),
    ).resolves.toEqual({
      data: [
        { id: 5, content: 'Newest' },
        { id: 4, content: 'Middle' },
      ],
      meta: { limit: 2, nextCursor: 4, hasNextPage: true },
    });

    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: task.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 3,
      }),
    );
  });

  it('uses the supplied cursor and reports when no additional activity exists', async () => {
    mockPrisma.taskActivity.findMany.mockResolvedValue([{ id: 2 }]);

    await expect(
      service.activity(task.id, { cursor: 3, limit: 2 }, member),
    ).resolves.toEqual({
      data: [{ id: 2 }],
      meta: { limit: 2, nextCursor: null, hasNextPage: false },
    });

    expect(mockPrisma.taskActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 3 },
        skip: 1,
        take: 3,
      }),
    );
  });

  it('emits an event after updating a comment', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: 9,
      taskId: task.id,
      authorId: member.sub,
    });
    mockPrisma.comment.update.mockResolvedValue({ id: 9 });

    await service.update(task.id, 9, 'Updated', member);

    expect(mockRealtime.emitCommentEvent).toHaveBeenCalledWith(
      task.projectId,
      'comment.updated',
      task.id,
      9,
      member.sub,
    );
  });

  it('prevents an admin from editing another user’s comment', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: 9,
      taskId: task.id,
      authorId: member.sub,
    });

    await expect(
      service.update(task.id, 9, 'Changed by admin', admin),
    ).rejects.toThrow(
      new ForbiddenException('Only the comment author can modify it'),
    );

    expect(mockPrisma.comment.update).not.toHaveBeenCalled();
  });

  it('prevents a different member from deleting a comment', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: 9,
      taskId: task.id,
      authorId: 8,
    });

    await expect(service.remove(task.id, 9, member)).rejects.toThrow(
      new ForbiddenException('Only the comment author can modify it'),
    );

    expect(mockPrisma.comment.delete).not.toHaveBeenCalled();
  });

  it('emits an event after deleting a comment', async () => {
    mockPrisma.comment.findUnique.mockResolvedValue({
      id: 9,
      taskId: task.id,
      authorId: member.sub,
    });

    await service.remove(task.id, 9, member);

    expect(mockRealtime.emitCommentEvent).toHaveBeenCalledWith(
      task.projectId,
      'comment.deleted',
      task.id,
      9,
      member.sub,
    );
  });
});
