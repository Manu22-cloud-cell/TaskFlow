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
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import {
    AuthenticatedUser,
    ProjectAccessService,
} from './project-access.service.js';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly projectAccess: ProjectAccessService,
    ) { }

    async create(
        createProjectDto: CreateProjectDto,
        requester: AuthenticatedUser,
    ) {
        if (
            requester.role === UserRole.MANAGER &&
            createProjectDto.ownerId !== undefined &&
            createProjectDto.ownerId !== requester.sub
        ) {
            throw new ForbiddenException(
                'Managers can only create projects for themselves',
            );
        }

        const ownerId =
            requester.role === UserRole.ADMIN
                ? (createProjectDto.ownerId ?? requester.sub)
                : requester.sub;

        const owner = await this.prisma.user.findUnique({
            where: {
                id: ownerId,
            },
        });

        if (!owner) {
            throw new NotFoundException('Owner user not found');
        }

        return this.prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    name: createProjectDto.name,
                    description: createProjectDto.description,
                    status: createProjectDto.status,
                    ownerId,
                },
            });

            await tx.projectMember.create({
                data: {
                    projectId: project.id,
                    userId: ownerId,
                    role: ProjectMemberRole.MANAGER,
                },
            });

            return project;
        });
    }

    async findAll(requester: AuthenticatedUser) {
        return this.prisma.project.findMany({
            where:
                requester.role === UserRole.ADMIN
                    ? undefined
                    : {
                        OR: [
                            { ownerId: requester.sub },
                            {
                                members: {
                                    some: { userId: requester.sub },
                                },
                            },
                        ],
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
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: number, requester: AuthenticatedUser) {
        await this.projectAccess.assertCanViewProject(id, requester);

        const project = await this.prisma.project.findUnique({
            where: {
                id,
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

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    async update(
        id: number,
        updateProjectDto: UpdateProjectDto,
        requester: AuthenticatedUser,
    ) {
        await this.projectAccess.assertCanManageProject(id, requester);

        return this.prisma.project.update({
            where: {
                id,
            },
            data: updateProjectDto,
        });
    }

    async remove(id: number, requester: AuthenticatedUser) {
        await this.projectAccess.assertCanDeleteProject(id, requester);

        await this.prisma.project.delete({
            where: {
                id,
            },
        });

        return {
            message: 'Project deleted successfully',
        };
    }
}
