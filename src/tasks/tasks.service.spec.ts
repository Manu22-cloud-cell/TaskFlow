import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserRole } from '../generated/prisma/enums.js';
import { TasksService } from './tasks.service.js';

describe('TasksService', () => {
  const manager = { sub: 2, email: 'manager@example.com', role: UserRole.MANAGER };
  const member = { sub: 3, email: 'member@example.com', role: UserRole.MEMBER };
  const mockPrisma = {
    user: { findUnique: jest.fn() },
    task: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(),
    },
  };
  const mockProjectAccess = {
    assertCanManageProject: jest.fn(),
    assertCanViewProject: jest.fn(),
    assertProjectMember: jest.fn(),
  };
  let service: TasksService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TasksService(mockPrisma as any, mockProjectAccess as any);
  });

  it('requires project management access and project membership for an assignee', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 3 });
    mockPrisma.task.create.mockResolvedValue({ id: 10 });

    await service.create({ title: 'Build board', projectId: 4, assignedToId: 3 }, manager);

    expect(mockProjectAccess.assertCanManageProject).toHaveBeenCalledWith(4, manager);
    expect(mockProjectAccess.assertProjectMember).toHaveBeenCalledWith(4, 3);
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
});
