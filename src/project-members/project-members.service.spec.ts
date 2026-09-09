import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  ProjectMemberRole,
  UserRole,
} from '../generated/prisma/enums.js';

import { ProjectMembersService } from './project-members.service.js';

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
    },

    user: {
      findUnique: jest.fn(),
    },

    projectMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

  };

  beforeEach(() => {
    jest.resetAllMocks();

    service = new ProjectMembersService(mockPrisma as any);
  });

  describe('addMember', () => {
    it('should add a user as a project member successfully', async () => {
      const projectId = 1;

      const addProjectMemberDto = {
        userId: 2,
      };

      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const user = {
        id: 2,
        name: 'John',
        email: 'john@example.com',
      };

      const createdMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: 'MEMBER',
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);
      mockPrisma.projectMember.create.mockResolvedValue(
        createdMembership,
      );

      const result = await service.addMember(
        projectId,
        addProjectMemberDto as any,
      );

      expect(result).toEqual(createdMembership);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
      });

      expect(mockPrisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 1,
            userId: 2,
          },
        },
      });

      expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 1,
          userId: 2,
        },
      });
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      const addProjectMemberDto = {
        userId: 2,
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(999, addProjectMemberDto as any),
      ).rejects.toThrow(
        new NotFoundException('Project not found'),
      );

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.projectMember.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.projectMember.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const addProjectMemberDto = {
        userId: 999,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(1, addProjectMemberDto as any),
      ).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockPrisma.projectMember.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.projectMember.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the user is already a project member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const user = {
        id: 2,
        name: 'John',
        email: 'john@example.com',
      };

      const existingMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: 'MEMBER',
      };

      const addProjectMemberDto = {
        userId: 2,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        existingMembership,
      );

      await expect(
        service.addMember(1, addProjectMemberDto as any),
      ).rejects.toThrow(
        new ConflictException(
          'User is already a member of this project',
        ),
      );

      expect(mockPrisma.projectMember.create).not.toHaveBeenCalled();
    });
  });

  describe('findMembers', () => {
    it('should return all members of a project', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const members = [
        {
          id: 1,
          role: 'MANAGER',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 1,
            name: 'John',
            email: 'john@example.com',
          },
        },
        {
          id: 2,
          role: 'MEMBER',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 2,
            name: 'Jane',
            email: 'jane@example.com',
          },
        },
      ];

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findMany.mockResolvedValue(members);

      const result = await service.findMembers(1);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockPrisma.projectMember.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 1,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual(members);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findMembers(999)).rejects.toThrow(
        'Project not found',
      );

      expect(mockPrisma.projectMember.findMany).not.toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should allow an ADMIN to update a project member role', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const updatedMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        targetMembership,
      );
      mockPrisma.projectMember.update.mockResolvedValue(
        updatedMembership,
      );

      const result = await service.updateMember(
        1,
        2,
        { role: ProjectMemberRole.MANAGER },
        99,
        UserRole.ADMIN,
      );

      expect(result).toEqual(updatedMembership);

      expect(mockPrisma.projectMember.update).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 1,
            userId: 2,
          },
        },
        data: {
          role: ProjectMemberRole.MANAGER,
        },
      });
    });

    it('should allow the project owner to update a member role', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const updatedMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(targetMembership)
        .mockResolvedValueOnce(null);

      mockPrisma.projectMember.update.mockResolvedValue(
        updatedMembership,
      );

      const result = await service.updateMember(
        1,
        2,
        { role: ProjectMemberRole.MANAGER },
        10,
        UserRole.MEMBER,
      );

      expect(result).toEqual(updatedMembership);

      expect(
        mockPrisma.projectMember.update,
      ).toHaveBeenCalled();
    });

    it('should allow a project MANAGER to update a member role', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const requesterMembership = {
        id: 3,
        projectId: 1,
        userId: 5,
        role: ProjectMemberRole.MANAGER,
      };

      const updatedMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(targetMembership)
        .mockResolvedValueOnce(requesterMembership);

      mockPrisma.projectMember.update.mockResolvedValue(
        updatedMembership,
      );

      const result = await service.updateMember(
        1,
        2,
        { role: ProjectMemberRole.MANAGER },
        5,
        UserRole.MEMBER,
      );

      expect(result).toEqual(updatedMembership);

      expect(
        mockPrisma.projectMember.update,
      ).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a project MEMBER tries to update a role', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const requesterMembership = {
        id: 3,
        projectId: 1,
        userId: 5,
        role: ProjectMemberRole.MEMBER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(targetMembership)
        .mockResolvedValueOnce(requesterMembership);

      await expect(
        service.updateMember(
          1,
          2,
          { role: ProjectMemberRole.MANAGER },
          5,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'You do not have permission to manage project members',
        ),
      );

      expect(
        mockPrisma.projectMember.update,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMember(
          999,
          2,
          { role: ProjectMemberRole.MANAGER },
          5,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new NotFoundException('Project not found'),
      );

      expect(
        mockPrisma.projectMember.findUnique,
      ).not.toHaveBeenCalled();

      expect(
        mockPrisma.projectMember.update,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the target user is not a project member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMember(
          1,
          999,
          { role: ProjectMemberRole.MANAGER },
          10,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new NotFoundException('Project member not found'),
      );

      expect(
        mockPrisma.projectMember.update,
      ).not.toHaveBeenCalled();
    });

    it('should prevent the project owner from being demoted to MEMBER', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const ownerMembership = {
        id: 1,
        projectId: 1,
        userId: 10,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        ownerMembership,
      );

      await expect(
        service.updateMember(
          1,
          10,
          { role: ProjectMemberRole.MEMBER },
          10,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'Project owner must remain a manager',
        ),
      );

      expect(
        mockPrisma.projectMember.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should allow an ADMIN to remove a project member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        targetMembership,
      );
      mockPrisma.projectMember.delete.mockResolvedValue(
        targetMembership,
      );

      const result = await service.removeMember(
        1,
        2,
        99,
        UserRole.ADMIN,
      );

      expect(result).toEqual({
        message: 'Project member removed successfully',
      });

      expect(
        mockPrisma.projectMember.delete,
      ).toHaveBeenCalledWith({
        where: {
          projectId_userId: {
            projectId: 1,
            userId: 2,
          },
        },
      });
    });

    it('should allow the project owner to remove a member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        targetMembership,
      );
      mockPrisma.projectMember.delete.mockResolvedValue(
        targetMembership,
      );

      const result = await service.removeMember(
        1,
        2,
        10,
        UserRole.MEMBER,
      );

      expect(result).toEqual({
        message: 'Project member removed successfully',
      });

      expect(
        mockPrisma.projectMember.delete,
      ).toHaveBeenCalled();
    });

    it('should allow a project MANAGER to remove a member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const requesterMembership = {
        id: 3,
        projectId: 1,
        userId: 5,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(targetMembership)
        .mockResolvedValueOnce(requesterMembership);

      mockPrisma.projectMember.delete.mockResolvedValue(
        targetMembership,
      );

      const result = await service.removeMember(
        1,
        2,
        5,
        UserRole.MEMBER,
      );

      expect(result).toEqual({
        message: 'Project member removed successfully',
      });

      expect(
        mockPrisma.projectMember.delete,
      ).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a project MEMBER tries to remove a member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const targetMembership = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: ProjectMemberRole.MEMBER,
      };

      const requesterMembership = {
        id: 3,
        projectId: 1,
        userId: 5,
        role: ProjectMemberRole.MEMBER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      mockPrisma.projectMember.findUnique
        .mockResolvedValueOnce(targetMembership)
        .mockResolvedValueOnce(requesterMembership);

      await expect(
        service.removeMember(
          1,
          2,
          5,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'You do not have permission to manage project members',
        ),
      );

      expect(
        mockPrisma.projectMember.delete,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(
          999,
          2,
          5,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new NotFoundException('Project not found'),
      );

      expect(
        mockPrisma.projectMember.findUnique,
      ).not.toHaveBeenCalled();

      expect(
        mockPrisma.projectMember.delete,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the target user is not a project member', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(
          1,
          999,
          10,
          UserRole.MEMBER,
        ),
      ).rejects.toThrow(
        new NotFoundException('Project member not found'),
      );

      expect(
        mockPrisma.projectMember.delete,
      ).not.toHaveBeenCalled();
    });

    it('should prevent the project owner from being removed', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 10,
      };

      const ownerMembership = {
        id: 1,
        projectId: 1,
        userId: 10,
        role: ProjectMemberRole.MANAGER,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.projectMember.findUnique.mockResolvedValue(
        ownerMembership,
      );

      await expect(
        service.removeMember(
          1,
          10,
          99,
          UserRole.ADMIN,
        ),
      ).rejects.toThrow(
        new ForbiddenException(
          'Project owner cannot be removed',
        ),
      );

      expect(
        mockPrisma.projectMember.delete,
      ).not.toHaveBeenCalled();
    });
  });
});