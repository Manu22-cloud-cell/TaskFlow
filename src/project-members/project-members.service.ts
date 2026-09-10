import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import {
    AuthenticatedUser,
    ProjectAccessService,
} from '../projects/project-access.service.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';

@Injectable()
export class ProjectMembersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly projectAccess: ProjectAccessService,
    ) { }

    async addMember(
        projectId: number,
        addProjectMemberDto: AddProjectMemberDto,
        requester: AuthenticatedUser,
    ) {
        await this.projectAccess.assertCanManageProject(
            projectId,
            requester,
        );

        const user = await this.prisma.user.findUnique({
            where: {
                id: addProjectMemberDto.userId,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingMembership =
            await this.prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: addProjectMemberDto.userId,
                    },
                },
            });

        if (existingMembership) {
            throw new ConflictException(
                'User is already a member of this project',
            );
        }

        return this.prisma.projectMember.create({
            data: {
                projectId,
                userId: addProjectMemberDto.userId,
            },
        });
    }

    async findMembers(
        projectId: number,
        requester: AuthenticatedUser,
    ) {
        await this.projectAccess.assertCanViewProject(
            projectId,
            requester,
        );

        return this.prisma.projectMember.findMany({
            where: {
                projectId,
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
    }

    async updateMember(
        projectId: number,
        userId: number,
        updateProjectMemberDto: UpdateProjectMemberDto,
        requester: AuthenticatedUser,
    ) {
        const project = await this.projectAccess.assertCanManageProject(
            projectId,
            requester,
        );

        const targetMembership =
            await this.prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId,
                    },
                },
            });

        if (!targetMembership) {
            throw new NotFoundException(
                'Project member not found',
            );
        }

        const isOwnerTarget = project.ownerId === userId;

        if (
            isOwnerTarget &&
            updateProjectMemberDto.role !== 'MANAGER'
        ) {
            throw new ForbiddenException(
                'Project owner must remain a manager',
            );
        }

        return this.prisma.projectMember.update({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
            data: {
                role: updateProjectMemberDto.role,
            },
        });
    }

    async removeMember(
        projectId: number,
        userId: number,
        requester: AuthenticatedUser,
    ) {
        const project = await this.projectAccess.assertCanManageProject(
            projectId,
            requester,
        );

        const targetMembership =
            await this.prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId,
                    },
                },
            });

        if (!targetMembership) {
            throw new NotFoundException(
                'Project member not found',
            );
        }

        const isOwnerTarget = project.ownerId === userId;

        if (isOwnerTarget) {
            throw new ForbiddenException(
                'Project owner cannot be removed',
            );
        }

        await this.prisma.projectMember.delete({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });

        return {
            message: 'Project member removed successfully',
        };
    }
}
