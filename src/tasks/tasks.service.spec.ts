import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TasksService } from './tasks.service.js';

describe('TasksService', () => {
  let service: TasksService;

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const createTaskDto = {
        title: 'Build API',
        description: 'Create task endpoints',
        priority: 'HIGH',
        projectId: 1,
        assignedToId: 2,
        dueDate: '2026-09-10T10:00:00.000Z',
      };

      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const user = {
        id: 2,
        name: 'Manoj',
        email: 'manoj@example.com',
      };

      const createdTask = {
        id: 1,
        title: 'Build API',
        description: 'Create task endpoints',
        priority: 'HIGH',
        projectId: 1,
        assignedToId: 2,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.task.create.mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto as any);

      expect(result).toEqual(createdTask);

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

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Build API',
          description: 'Create task endpoints',
          status: undefined,
          priority: 'HIGH',
          dueDate: new Date('2026-09-10T10:00:00.000Z'),
          projectId: 1,
          assignedToId: 2,
        },
      });
    });

    it('should create a task without an assigned user', async () => {
      const createTaskDto = {
        title: 'Unassigned task',
        projectId: 1,
      };

      const project = {
        id: 1,
        name: 'TaskFlow',
      };

      const createdTask = {
        id: 1,
        title: 'Unassigned task',
        projectId: 1,
        assignedToId: null,
      };

      mockPrisma.project.findUnique.mockResolvedValue(project);
      mockPrisma.task.create.mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto as any);

      expect(result).toEqual(createdTask);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Unassigned task',
          description: undefined,
          status: undefined,
          priority: undefined,
          dueDate: undefined,
          projectId: 1,
          assignedToId: undefined,
        },
      });
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      const createTaskDto = {
        title: 'Build API',
        projectId: 999,
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.create(createTaskDto as any)).rejects.toThrow(
        new NotFoundException('Project not found'),
      );

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when assigned user does not exist', async () => {
      const createTaskDto = {
        title: 'Build API',
        projectId: 1,
        assignedToId: 999,
      };

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 1,
        name: 'TaskFlow',
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createTaskDto as any)).rejects.toThrow(
        new NotFoundException('Assigned user not found'),
      );

      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tasks with project and assignee details', async () => {
      const tasks = [
        {
          id: 1,
          title: 'Build API',
          project: {
            id: 1,
            name: 'TaskFlow',
          },
          assignee: {
            id: 2,
            name: 'Manoj',
            email: 'manoj@example.com',
          },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(tasks);

      const result = await service.findAll();

      expect(result).toEqual(tasks);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignee: {
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
    it('should return a task when the task exists', async () => {
      const task = {
        id: 1,
        title: 'Build API',
        project: {
          id: 1,
          name: 'TaskFlow',
        },
        assignee: {
          id: 2,
          name: 'Manoj',
          email: 'manoj@example.com',
        },
      };

      mockPrisma.task.findUnique.mockResolvedValue(task);

      const result = await service.findOne(1);

      expect(result).toEqual(task);

      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const updateTaskDto = {
        title: 'Updated task',
        status: 'IN_PROGRESS',
        dueDate: '2026-09-15T10:00:00.000Z',
        assignedToId: 2,
      };

      const existingTask = {
        id: 1,
        title: 'Build API',
        projectId: 1,
      };

      const updatedTask = {
        id: 1,
        title: 'Updated task',
        status: 'IN_PROGRESS',
        assignedToId: 2,
      };

      mockPrisma.task.findUnique.mockResolvedValue(existingTask);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        name: 'Manoj',
      });
      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(1, updateTaskDto as any);

      expect(result).toEqual(updatedTask);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          title: 'Updated task',
          description: undefined,
          status: 'IN_PROGRESS',
          priority: undefined,
          dueDate: new Date('2026-09-15T10:00:00.000Z'),
          assignedToId: 2,
        },
      });
    });

    it('should update a task without checking assigned user when assignedToId is absent', async () => {
      const updateTaskDto = {
        title: 'Updated task',
      };

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 1,
        title: 'Build API',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 1,
        title: 'Updated task',
      });

      const result = await service.update(1, updateTaskDto as any);

      expect(result).toEqual({
        id: 1,
        title: 'Updated task',
      });

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { title: 'Updated task' } as any),
      ).rejects.toThrow(new NotFoundException('Task not found'));

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when assigned user does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 1,
        title: 'Build API',
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(1, { assignedToId: 999 } as any),
      ).rejects.toThrow(new NotFoundException('Assigned user not found'));

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a task successfully', async () => {
      const existingTask = {
        id: 1,
        title: 'Build API',
      };

      mockPrisma.task.findUnique.mockResolvedValue(existingTask);
      mockPrisma.task.delete.mockResolvedValue(existingTask);

      const result = await service.remove(1);

      expect(result).toEqual({
        message: 'Task deleted successfully',
      });

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('should throw NotFoundException when deleting a non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Task not found'),
      );

      expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    });
  });
});