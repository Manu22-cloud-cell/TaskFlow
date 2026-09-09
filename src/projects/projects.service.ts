import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ProjectMemberRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProjectDto: CreateProjectDto) {
        const owner = await this.prisma.user.findUnique({
            where: {
                id: createProjectDto.ownerId,
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
                    ownerId: createProjectDto.ownerId,
                },
            });

            await tx.projectMember.create({
                data: {
                    projectId: project.id,
                    userId: createProjectDto.ownerId,
                    role: ProjectMemberRole.MANAGER,
                },
            });

            return project;
        });
    }

    async findAll() {
        return this.prisma.project.findMany({
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

    async findOne(id: number) {
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

    async update(id: number, updateProjectDto: UpdateProjectDto) {
        const existingProject = await this.prisma.project.findUnique({
            where: {
                id,
            },
        });

        if (!existingProject) {
            throw new NotFoundException('Project not found');
        }

        return this.prisma.project.update({
            where: {
                id,
            },
            data: updateProjectDto,
        });
    }

    async remove(id: number) {
        const existingProject = await this.prisma.project.findUnique({
            where: {
                id,
            },
        });

        if (!existingProject) {
            throw new NotFoundException('Project not found');
        }

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