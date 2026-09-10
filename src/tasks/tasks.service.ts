import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../generated/prisma/enums.js';
import {
    AuthenticatedUser,
    ProjectAccessService,
} from '../projects/project-access.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly projectAccess: ProjectAccessService,
    ) { }

    async create(
        createTaskDto: CreateTaskDto,
        requester: AuthenticatedUser,
    ) {
        await this.projectAccess.assertCanManageProject(
            createTaskDto.projectId,
            requester,
        );

        if (createTaskDto.assignedToId !== undefined) {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: createTaskDto.assignedToId,
                },
            });

            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }

            await this.projectAccess.assertProjectMember(
                createTaskDto.projectId,
                createTaskDto.assignedToId,
            );
        }

        return this.prisma.task.create({
            data: {
                title: createTaskDto.title,
                description: createTaskDto.description,
                status: createTaskDto.status,
                priority: createTaskDto.priority,
                dueDate: createTaskDto.dueDate
                    ? new Date(createTaskDto.dueDate)
                    : undefined,
                projectId: createTaskDto.projectId,
                assignedToId: createTaskDto.assignedToId,
            },
        });
    }

    async findAll(requester: AuthenticatedUser) {
        return this.prisma.task.findMany({
            where:
                requester.role === UserRole.ADMIN
                    ? undefined
                    : {
                        project: {
                            OR: [
                                { ownerId: requester.sub },
                                {
                                    members: {
                                        some: { userId: requester.sub },
                                    },
                                },
                            ],
                        },
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
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: number, requester: AuthenticatedUser) {
        const task = await this.prisma.task.findUnique({
            where: {
                id,
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

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        await this.projectAccess.assertCanViewProject(
            task.projectId,
            requester,
        );

        return task;
    }

    async update(
        id: number,
        updateTaskDto: UpdateTaskDto,
        requester: AuthenticatedUser,
    ) {
        const existingTask = await this.prisma.task.findUnique({
            where: {
                id,
            },
        });

        if (!existingTask) {
            throw new NotFoundException('Task not found');
        }

        await this.projectAccess.assertCanManageProject(
            existingTask.projectId,
            requester,
        );

        if (updateTaskDto.assignedToId !== undefined) {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: updateTaskDto.assignedToId,
                },
            });

            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }

            await this.projectAccess.assertProjectMember(
                existingTask.projectId,
                updateTaskDto.assignedToId,
            );
        }

        return this.prisma.task.update({
            where: {
                id,
            },
            data: {
                title: updateTaskDto.title,
                description: updateTaskDto.description,
                status: updateTaskDto.status,
                priority: updateTaskDto.priority,
                dueDate: updateTaskDto.dueDate
                    ? new Date(updateTaskDto.dueDate)
                    : undefined,
                assignedToId: updateTaskDto.assignedToId,
            },
        });
    }

    async remove(id: number, requester: AuthenticatedUser) {
        const existingTask = await this.prisma.task.findUnique({
            where: {
                id,
            },
        });

        if (!existingTask) {
            throw new NotFoundException('Task not found');
        }

        await this.projectAccess.assertCanManageProject(
            existingTask.projectId,
            requester,
        );

        await this.prisma.task.delete({
            where: {
                id,
            },
        });

        return {
            message: 'Task deleted successfully',
        };
    }
}
