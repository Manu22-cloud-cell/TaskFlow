import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ProjectMemberRole,
  UserRole,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuthenticatedUser = {
  sub: number;
  email: string;
  role: UserRole;
};

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanViewProject(
    projectId: number,
    requester: AuthenticatedUser,
  ) {
    const project = await this.findProjectOrThrow(projectId);

    if (
      requester.role === UserRole.ADMIN ||
      project.ownerId === requester.sub
    ) {
      return project;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: requester.sub,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }

    return project;
  }

  async assertCanManageProject(
    projectId: number,
    requester: AuthenticatedUser,
  ) {
    const project = await this.findProjectOrThrow(projectId);

    if (
      requester.role === UserRole.ADMIN ||
      project.ownerId === requester.sub
    ) {
      return project;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: requester.sub,
        },
      },
    });

    if (membership?.role !== ProjectMemberRole.MANAGER) {
      throw new ForbiddenException(
        'You do not have permission to manage this project',
      );
    }

    return project;
  }

  async assertCanDeleteProject(
    projectId: number,
    requester: AuthenticatedUser,
  ) {
    const project = await this.findProjectOrThrow(projectId);

    if (
      requester.role !== UserRole.ADMIN &&
      project.ownerId !== requester.sub
    ) {
      throw new ForbiddenException(
        'Only the project owner or an admin can delete this project',
      );
    }

    return project;
  }

  async assertProjectMember(projectId: number, userId: number) {
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'User is not a member of this project',
      );
    }

    return membership;
  }

  private async findProjectOrThrow(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
