import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../generated/prisma/enums.js';
import { TaskStatus } from '../generated/prisma/enums.js';
import {
    AuthenticatedUser,
    ProjectAccessService,
} from '../projects/project-access.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListProjectTasksDto } from './dto/list-project-tasks.dto.js';
import { MoveTaskDto } from './dto/move-task.dto.js';

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

        const status = createTaskDto.status ?? TaskStatus.TODO;

        return this.prisma.$transaction(async (tx) => {
            const position = await tx.task.count({
                where: {
                    projectId: createTaskDto.projectId,
                    status,
                },
            });

            return tx.task.create({
                data: {
                    title: createTaskDto.title,
                    description: createTaskDto.description,
                    status,
                    priority: createTaskDto.priority,
                    dueDate: createTaskDto.dueDate
                        ? new Date(createTaskDto.dueDate)
                        : undefined,
                    projectId: createTaskDto.projectId,
                    assignedToId: createTaskDto.assignedToId,
                    position,
                },
            });
        });
    }

    async findByProject(
        projectId: number,
        filters: ListProjectTasksDto,
        requester: AuthenticatedUser,
    ) {
        await this.projectAccess.assertCanViewProject(
            projectId,
            requester,
        );

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 50;
        const dueDateFilter = filters.dueDate
            ? this.getDueDateFilter(filters.dueDate)
            : undefined;
        const where = {
            projectId,
            ...(filters.status && { status: filters.status }),
            ...(filters.assignedToId !== undefined && {
                assignedToId: filters.assignedToId,
            }),
            ...(filters.priority && { priority: filters.priority }),
            ...(dueDateFilter && { dueDate: dueDateFilter }),
        };

        const [data, total] = await this.prisma.$transaction([
            this.prisma.task.findMany({
                where,
                include: {
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { status: 'asc' },
                    { position: 'asc' },
                    { id: 'asc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
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

    async move(
        id: number,
        moveTaskDto: MoveTaskDto,
        requester: AuthenticatedUser,
    ) {
        const existingTask = await this.prisma.task.findUnique({
            where: { id },
        });

        if (!existingTask) {
            throw new NotFoundException('Task not found');
        }

        await this.projectAccess.assertCanManageProject(
            existingTask.projectId,
            requester,
        );

        return this.prisma.$transaction(async (tx) => {
            const task = await tx.task.findUnique({ where: { id } });

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            if (task.status === moveTaskDto.status) {
                const taskCount = await tx.task.count({
                    where: {
                        projectId: task.projectId,
                        status: task.status,
                    },
                });
                const position = Math.min(
                    moveTaskDto.position,
                    Math.max(taskCount - 1, 0),
                );

                if (position > task.position) {
                    await tx.task.updateMany({
                        where: {
                            projectId: task.projectId,
                            status: task.status,
                            position: {
                                gt: task.position,
                                lte: position,
                            },
                        },
                        data: { position: { decrement: 1 } },
                    });
                } else if (position < task.position) {
                    await tx.task.updateMany({
                        where: {
                            projectId: task.projectId,
                            status: task.status,
                            position: {
                                gte: position,
                                lt: task.position,
                            },
                        },
                        data: { position: { increment: 1 } },
                    });
                }

                return tx.task.update({
                    where: { id },
                    data: { position },
                });
            }

            await tx.task.updateMany({
                where: {
                    projectId: task.projectId,
                    status: task.status,
                    position: { gt: task.position },
                },
                data: { position: { decrement: 1 } },
            });

            const targetColumnCount = await tx.task.count({
                where: {
                    projectId: task.projectId,
                    status: moveTaskDto.status,
                },
            });
            const position = Math.min(
                moveTaskDto.position,
                targetColumnCount,
            );

            await tx.task.updateMany({
                where: {
                    projectId: task.projectId,
                    status: moveTaskDto.status,
                    position: { gte: position },
                },
                data: { position: { increment: 1 } },
            });

            return tx.task.update({
                where: { id },
                data: {
                    status: moveTaskDto.status,
                    position,
                },
            });
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

    private getDueDateFilter(dueDate: string) {
        const start = new Date(dueDate);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        return {
            gte: start,
            lt: end,
        };
    }
}
