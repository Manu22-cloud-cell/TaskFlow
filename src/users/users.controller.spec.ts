import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new UsersController(
      mockUsersService as unknown as UsersService,
    );

  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});