import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UserRole } from '../generated/prisma/enums.js';
import { ProjectMembersService } from './project-members.service.js';

describe('ProjectMembersService', () => {
  const owner = { sub: 1, email: 'owner@example.com', role: UserRole.MEMBER };
  const mockPrisma = {
    user: { findUnique: jest.fn() },
    projectMember: {
      findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
      update: jest.fn(), delete: jest.fn(),
    },
  };
  const mockProjectAccess = {
    assertCanViewProject: jest.fn(),
    assertCanManageProject: jest.fn(),
  };
  let service: ProjectMembersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ProjectMembersService(mockPrisma as any, mockProjectAccess as any);
  });

  it('requires project management access before adding a member', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 2 });
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);
    mockPrisma.projectMember.create.mockResolvedValue({ projectId: 4, userId: 2 });

    await service.addMember(4, { userId: 2 }, owner);

    expect(mockProjectAccess.assertCanManageProject).toHaveBeenCalledWith(4, owner);
  });

  it('requires project visibility before listing members', async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([]);

    await service.findMembers(4, owner);

    expect(mockProjectAccess.assertCanViewProject).toHaveBeenCalledWith(4, owner);
  });

  it('does not allow the owner to be demoted', async () => {
    mockProjectAccess.assertCanManageProject.mockResolvedValue({ ownerId: 1 });
    mockPrisma.projectMember.findUnique.mockResolvedValue({ projectId: 4, userId: 1 });

    await expect(
      service.updateMember(4, 1, { role: 'MEMBER' } as any, owner),
    ).rejects.toThrow(new ForbiddenException('Project owner must remain a manager'));
  });

  it('does not allow the owner to be removed', async () => {
    mockProjectAccess.assertCanManageProject.mockResolvedValue({ ownerId: 1 });
    mockPrisma.projectMember.findUnique.mockResolvedValue({ projectId: 4, userId: 1 });

    await expect(service.removeMember(4, 1, owner)).rejects.toThrow(
      new ForbiddenException('Project owner cannot be removed'),
    );
  });
});
