import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Injectable()
export class TasksService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createTaskDto: CreateTaskDto) {
        const project = await this.prisma.project.findUnique({
            where: {
                id: createTaskDto.projectId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        if (createTaskDto.assignedToId !== undefined) {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: createTaskDto.assignedToId,
                },
            });

            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }
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

    async findAll() {
        return this.prisma.task.findMany({
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

    async findOne(id: number) {
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

        return task;
    }

    async update(id: number, updateTaskDto: UpdateTaskDto) {
        const existingTask = await this.prisma.task.findUnique({
            where: {
                id,
            },
        });

        if (!existingTask) {
            throw new NotFoundException('Task not found');
        }

        if (updateTaskDto.assignedToId !== undefined) {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: updateTaskDto.assignedToId,
                },
            });

            if (!user) {
                throw new NotFoundException('Assigned user not found');
            }
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

    async remove(id: number) {
        const existingTask = await this.prisma.task.findUnique({
            where: {
                id,
            },
        });

        if (!existingTask) {
            throw new NotFoundException('Task not found');
        }

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