import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const mockProjectsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    controller = new ProjectsController(
      mockProjectsService as unknown as ProjectsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});