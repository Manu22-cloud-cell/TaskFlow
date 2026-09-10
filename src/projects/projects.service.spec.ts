import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserRole } from '../generated/prisma/enums.js';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  const admin = { sub: 1, email: 'admin@example.com', role: UserRole.ADMIN };
  const manager = { sub: 2, email: 'manager@example.com', role: UserRole.MANAGER };
  const mockPrisma = {
    user: { findUnique: jest.fn() },
    project: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(),
    },
    projectMember: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const mockProjectAccess = {
    assertCanViewProject: jest.fn(),
    assertCanManageProject: jest.fn(),
    assertCanDeleteProject: jest.fn(),
  };
  let service: ProjectsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProjectsService(mockPrisma as any, mockProjectAccess as any);
  });

  it('lets an admin choose the project owner and creates their manager membership', async () => {
    const project = { id: 10, ownerId: 7 };
    mockPrisma.user.findUnique.mockResolvedValue({ id: 7 });
    mockPrisma.project.create.mockResolvedValue(project);
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));

    await expect(service.create({ name: 'Roadmap', ownerId: 7 }, admin)).resolves.toEqual(project);

    expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
      data: { projectId: 10, userId: 7, role: 'MANAGER' },
    });
  });

  it('prevents a global manager from choosing another owner', async () => {
    await expect(
      service.create({ name: 'Roadmap', ownerId: 7 }, manager),
    ).rejects.toThrow(new ForbiddenException('Managers can only create projects for themselves'));
  });

  it('filters a non-admin project list to owned or member projects', async () => {
    mockPrisma.project.findMany.mockResolvedValue([]);
    await service.findAll(manager);

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { ownerId: manager.sub },
          { members: { some: { userId: manager.sub } } },
        ],
      },
    }));
  });

  it('uses project-scoped access before updating or deleting', async () => {
    mockPrisma.project.update.mockResolvedValue({ id: 10, name: 'Updated' });
    mockPrisma.project.delete.mockResolvedValue({ id: 10 });

    await service.update(10, { name: 'Updated' }, manager);
    await service.remove(10, admin);

    expect(mockProjectAccess.assertCanManageProject).toHaveBeenCalledWith(10, manager);
    expect(mockProjectAccess.assertCanDeleteProject).toHaveBeenCalledWith(10, admin);
  });
});
