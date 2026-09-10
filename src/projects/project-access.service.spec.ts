import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  ProjectMemberRole,
  UserRole,
} from '../generated/prisma/enums.js';
import { ProjectAccessService } from './project-access.service.js';

describe('ProjectAccessService', () => {
  const project = { id: 4, ownerId: 1 };
  const mockPrisma = {
    project: { findUnique: jest.fn() },
    projectMember: { findUnique: jest.fn() },
  };
  let service: ProjectAccessService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue(project);
    service = new ProjectAccessService(mockPrisma as any);
  });

  it('allows an admin to manage every project', async () => {
    const admin = { sub: 9, email: 'admin@example.com', role: UserRole.ADMIN };

    await expect(service.assertCanManageProject(4, admin)).resolves.toEqual(project);
  });

  it('allows an owner and a project manager to manage their project', async () => {
    const owner = { sub: 1, email: 'owner@example.com', role: UserRole.MEMBER };
    const manager = { sub: 2, email: 'manager@example.com', role: UserRole.MANAGER };
    mockPrisma.projectMember.findUnique.mockResolvedValue({
      projectId: 4,
      userId: 2,
      role: ProjectMemberRole.MANAGER,
    });

    await expect(service.assertCanManageProject(4, owner)).resolves.toEqual(project);
    await expect(service.assertCanManageProject(4, manager)).resolves.toEqual(project);
  });

  it('rejects a project member without a manager role from managing', async () => {
    const member = { sub: 3, email: 'member@example.com', role: UserRole.MEMBER };
    mockPrisma.projectMember.findUnique.mockResolvedValue({
      projectId: 4,
      userId: 3,
      role: ProjectMemberRole.MEMBER,
    });

    await expect(service.assertCanManageProject(4, member)).rejects.toThrow(
      new ForbiddenException('You do not have permission to manage this project'),
    );
  });

  it('allows only the owner or an admin to delete a project', async () => {
    const manager = { sub: 2, email: 'manager@example.com', role: UserRole.MANAGER };

    await expect(service.assertCanDeleteProject(4, manager)).rejects.toThrow(
      new ForbiddenException('Only the project owner or an admin can delete this project'),
    );
  });

  it('reports a missing project before evaluating access', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const admin = { sub: 9, email: 'admin@example.com', role: UserRole.ADMIN };

    await expect(service.assertCanViewProject(4, admin)).rejects.toThrow(
      new NotFoundException('Project not found'),
    );
  });
});
