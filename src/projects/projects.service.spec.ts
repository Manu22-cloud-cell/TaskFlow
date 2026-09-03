import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ProjectsService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const createProjectDto = {
        name: 'TaskFlow',
        description: 'Project management application',
        ownerId: 1,
      };

      const owner = {
        id: 1,
        name: 'Manoj',
        email: 'manoj@example.com',
      };

      const createdProject = {
        id: 1,
        name: 'TaskFlow',
        description: 'Project management application',
        status: 'PLANNING',
        ownerId: 1,
      };

      mockPrisma.user.findUnique.mockResolvedValue(owner);
      mockPrisma.project.create.mockResolvedValue(createdProject);

      const result = await service.create(createProjectDto as any);

      expect(result).toEqual(createdProject);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'TaskFlow',
          description: 'Project management application',
          status: undefined,
          ownerId: 1,
        },
      });
    });

    it('should throw NotFoundException when the owner does not exist', async () => {
      const createProjectDto = {
        name: 'TaskFlow',
        description: 'Project management application',
        ownerId: 999,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createProjectDto as any)).rejects.toThrow(
        new NotFoundException('Owner user not found'),
      );

      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all projects with owner details', async () => {
      const projects = [
        {
          id: 1,
          name: 'TaskFlow',
          description: 'Project management application',
          status: 'PLANNING',
          ownerId: 1,
          owner: {
            id: 1,
            name: 'Manoj',
            email: 'manoj@example.com',
          },
        },
      ];

      mockPrisma.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(result).toEqual(projects);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a project when the project exists', async () => {
      const project = {
        id: 1,
        name: 'TaskFlow',
        description: 'Project management application',
        status: 'PLANNING',
        ownerId: 1,
        owner: {
          id: 1,
          name: 'Manoj',
          email: 'manoj@example.com',
        },
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);

      const result = await service.findOne(1);

      expect(result).toEqual(project);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const updateProjectDto = {
        name: 'Updated TaskFlow',
        description: 'Updated description',
      };

      const existingProject = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 1,
      };

      const updatedProject = {
        id: 1,
        name: 'Updated TaskFlow',
        description: 'Updated description',
        ownerId: 1,
      };

      mockPrisma.project.findUnique.mockResolvedValue(existingProject);
      mockPrisma.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(1, updateProjectDto as any);

      expect(result).toEqual(updatedProject);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: updateProjectDto,
      });
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      const updateProjectDto = {
        name: 'Updated TaskFlow',
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, updateProjectDto as any),
      ).rejects.toThrow(new NotFoundException('Project not found'));

      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a project successfully', async () => {
      const existingProject = {
        id: 1,
        name: 'TaskFlow',
        ownerId: 1,
      };

      mockPrisma.project.findUnique.mockResolvedValue(existingProject);
      mockPrisma.project.delete.mockResolvedValue(existingProject);

      const result = await service.remove(1);

      expect(result).toEqual({
        message: 'Project deleted successfully',
      });

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('should throw NotFoundException when deleting a non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );

      expect(mockPrisma.project.delete).not.toHaveBeenCalled();
    });
  });
});