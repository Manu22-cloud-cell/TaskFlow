import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    ProjectMemberRole,
    UserRole,
} from '../generated/prisma/enums.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';

@Injectable()
export class ProjectMembersService {
    constructor(private readonly prisma: PrismaService) { }

    async addMember(
        projectId: number,
        addProjectMemberDto: AddProjectMemberDto,
    ) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

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

    async findMembers(projectId: number) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

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
        requesterId: number,
        requesterRole: UserRole,
    ) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

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

        const isAdmin = requesterRole === UserRole.ADMIN;
        const isOwner = project.ownerId === requesterId;

        let isProjectManager = false;

        if (!isAdmin && !isOwner) {
            const requesterMembership =
                await this.prisma.projectMember.findUnique({
                    where: {
                        projectId_userId: {
                            projectId,
                            userId: requesterId,
                        },
                    },
                });

            isProjectManager =
                requesterMembership?.role === ProjectMemberRole.MANAGER;
        }

        if (!isAdmin && !isOwner && !isProjectManager) {
            throw new ForbiddenException(
                'You do not have permission to manage project members',
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
        requesterId: number,
        requesterRole: UserRole,
    ) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

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

        const isAdmin = requesterRole === UserRole.ADMIN;
        const isOwner = project.ownerId === requesterId;

        let isProjectManager = false;

        if (!isAdmin && !isOwner) {
            const requesterMembership =
                await this.prisma.projectMember.findUnique({
                    where: {
                        projectId_userId: {
                            projectId,
                            userId: requesterId,
                        },
                    },
                });

            isProjectManager =
                requesterMembership?.role === ProjectMemberRole.MANAGER;
        }

        if (!isAdmin && !isOwner && !isProjectManager) {
            throw new ForbiddenException(
                'You do not have permission to manage project members',
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