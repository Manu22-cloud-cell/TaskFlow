import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

describe('TasksController', () => {
  let controller: TasksController;

  const mockTasksService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    controller = new TasksController(
      mockTasksService as unknown as TasksService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});