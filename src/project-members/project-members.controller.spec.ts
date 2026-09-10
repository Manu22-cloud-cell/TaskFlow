import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectMembersService } from './project-members.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('ProjectMembersController', () => {
  let controller: ProjectMembersController;

  const mockProjectMembersService = {
    addMember: jest.fn(),
    findMembers: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
  };

  const mockJwtAuthGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectMembersController],
      providers: [
        {
          provide: ProjectMembersService,
          useValue: mockProjectMembersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ProjectMembersController>(
      ProjectMembersController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findMembers', () => {
    it('should call ProjectMembersService.findMembers with projectId', async () => {
      const projectId = 1;
      const request = {
        user: { sub: 10, email: 'member@example.com', role: 'MEMBER' },
      };

      const expectedResult = [
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

      mockProjectMembersService.findMembers.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findMembers(projectId, request as any);

      expect(
        mockProjectMembersService.findMembers,
      ).toHaveBeenCalledWith(projectId, request.user);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('addMember', () => {
    it('should call ProjectMembersService.addMember with projectId and userId', async () => {
      const projectId = 1;

      const addProjectMemberDto = {
        userId: 2,
      };
      const request = {
        user: { sub: 10, email: 'manager@example.com', role: 'MANAGER' },
      };

      const expectedResult = {
        id: 1,
        projectId: 1,
        userId: 2,
        role: 'MEMBER',
      };

      mockProjectMembersService.addMember.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.addMember(
        projectId,
        addProjectMemberDto,
        request as any,
      );

      expect(
        mockProjectMembersService.addMember,
      ).toHaveBeenCalledWith(
        projectId,
        addProjectMemberDto,
        request.user,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateMember', () => {
    it('should call ProjectMembersService.updateMember with project and requester details', async () => {
      const projectId = 1;
      const userId = 2;

      const updateProjectMemberDto = {
        role: 'MANAGER',
      };

      const request = {
        user: {
          sub: 10,
          email: 'owner@example.com',
          role: 'MEMBER',
        },
      };

      const expectedResult = {
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'MANAGER',
      };

      mockProjectMembersService.updateMember.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.updateMember(
        projectId,
        userId,
        updateProjectMemberDto,
        request as any,
      );

      expect(
        mockProjectMembersService.updateMember,
      ).toHaveBeenCalledWith(
        projectId,
        userId,
        updateProjectMemberDto,
        request.user,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  describe('removeMember', () => {
    it('should call ProjectMembersService.removeMember with project and requester details', async () => {
      const projectId = 1;
      const userId = 2;

      const request = {
        user: {
          sub: 10,
          email: 'owner@example.com',
          role: 'MEMBER',
        },
      };

      const expectedResult = {
        message: 'Project member removed successfully',
      };

      mockProjectMembersService.removeMember.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.removeMember(
        projectId,
        userId,
        request as any,
      );

      expect(
        mockProjectMembersService.removeMember,
      ).toHaveBeenCalledWith(
        projectId,
        userId,
        request.user,
      );

      expect(result).toEqual(expectedResult);
    });
  });
});
