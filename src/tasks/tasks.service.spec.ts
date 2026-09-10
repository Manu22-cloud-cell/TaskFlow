import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserRole } from '../generated/prisma/enums.js';
import { TasksService } from './tasks.service.js';

describe('TasksService', () => {
  const manager = { sub: 2, email: 'manager@example.com', role: UserRole.MANAGER };
  const member = { sub: 3, email: 'member@example.com', role: UserRole.MEMBER };
  const mockPrisma = {
    user: { findUnique: jest.fn() },
    taskActivity: { create: jest.fn(), createMany: jest.fn() },
    task: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(), count: jest.fn(), updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockProjectAccess = {
    assertCanManageProject: jest.fn(),
    assertCanViewProject: jest.fn(),
    assertProjectMember: jest.fn(),
  };
  let service: TasksService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (input: any) => (
      Array.isArray(input) ? Promise.all(input) : input(mockPrisma)
    ));
    service = new TasksService(mockPrisma as any, mockProjectAccess as any);
  });

  it('requires project management access and project membership for an assignee', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 3 });
    mockPrisma.task.count.mockResolvedValue(0);
    mockPrisma.task.create.mockResolvedValue({ id: 10 });

    await service.create({ title: 'Build board', projectId: 4, assignedToId: 3 }, manager);

    expect(mockProjectAccess.assertCanManageProject).toHaveBeenCalledWith(4, manager);
    expect(mockProjectAccess.assertProjectMember).toHaveBeenCalledWith(4, 3);
  });

  it('returns paginated, board-ordered tasks for a project', async () => {
    const tasks = [{ id: 10, status: 'TODO', position: 0 }];
    mockPrisma.task.findMany.mockResolvedValue(tasks);
    mockPrisma.task.count.mockResolvedValue(1);

    const result = await service.findByProject(
      4,
      { status: 'TODO', page: 2, limit: 10 } as any,
      member,
    );

    expect(mockProjectAccess.assertCanViewProject).toHaveBeenCalledWith(4, member);
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 4, status: 'TODO' },
      orderBy: [
        { status: 'asc' },
        { position: 'asc' },
        { id: 'asc' },
      ],
      skip: 10,
      take: 10,
    }));
    expect(result).toEqual({
      data: tasks,
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('filters a member task list to projects they own or belong to', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    await service.findAll(member);

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        project: {
          OR: [
            { ownerId: member.sub },
            { members: { some: { userId: member.sub } } },
          ],
        },
      },
    }));
  });

  it('checks project visibility before returning a task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 10, projectId: 4 });

    await service.findOne(10, member);

    expect(mockProjectAccess.assertCanViewProject).toHaveBeenCalledWith(4, member);
  });

  it('requires project management access before updating or deleting a task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 10, projectId: 4 });
    mockPrisma.task.update.mockResolvedValue({ id: 10 });
    mockPrisma.task.delete.mockResolvedValue({ id: 10 });

    await service.update(10, { title: 'Updated' }, manager);
    await service.remove(10, manager);

    expect(mockProjectAccess.assertCanManageProject).toHaveBeenCalledWith(4, manager);
  });

  it('moves a task between columns transactionally', async () => {
    const task = { id: 10, projectId: 4, status: 'TODO', position: 1 };
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.count.mockResolvedValue(3);
    mockPrisma.task.update.mockResolvedValue({
      ...task,
      status: 'IN_PROGRESS',
      position: 2,
    });

    await service.move(10, { status: 'IN_PROGRESS', position: 2 } as any, manager);

    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'TODO' }),
      data: { position: { decrement: 1 } },
    }));
    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'IN_PROGRESS' }),
      data: { position: { increment: 1 } },
    }));
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'IN_PROGRESS', position: 2 },
    });
  });

  it('allows an assigned member to transition only their own task', async () => {
    const task = {
      id: 10,
      projectId: 4,
      assignedToId: member.sub,
      status: 'TODO',
      position: 0,
    };
    mockPrisma.task.findUnique.mockResolvedValue(task);
    mockPrisma.task.count.mockResolvedValue(0);
    mockPrisma.task.update.mockResolvedValue({
      ...task,
      status: 'COMPLETED',
      position: 0,
    });

    await service.updateStatus(10, { status: 'COMPLETED' } as any, member);

    expect(mockProjectAccess.assertCanViewProject).toHaveBeenCalledWith(4, member);
    expect(mockProjectAccess.assertCanManageProject).not.toHaveBeenCalled();
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'COMPLETED', position: 0 },
    });
  });
});
