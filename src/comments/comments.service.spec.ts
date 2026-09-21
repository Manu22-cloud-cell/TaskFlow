import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserRole } from '../generated/prisma/enums.js';
import { CommentsService } from './comments.service.js';

describe('CommentsService', () => {
  const member = {
    sub: 3,
    email: 'member@example.com',
    role: UserRole.MEMBER,
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
    );
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
    );
  });
});
