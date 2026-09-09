import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { ProjectMembersService } from './project-members.service.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../generated/prisma/browser.js';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
    constructor(
        private readonly projectMembersService: ProjectMembersService,
    ) { }

    @Get()
    async findMembers(
        @Param('projectId', ParseIntPipe) projectId: number,
    ) {
        return this.projectMembersService.findMembers(projectId);
    }

    @Post()
    async addMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() addProjectMemberDto: AddProjectMemberDto,
    ) {
        return this.projectMembersService.addMember(
            projectId,
            addProjectMemberDto,
        );
    }

    @Patch(':userId')
    async updateMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() updateProjectMemberDto: UpdateProjectMemberDto,
        @Req()
        request: Request & {
            user: {
                sub: number;
                email: string;
                role: UserRole;
            };
        },
    ) {
        const requesterId = request.user.sub;
        const requesterRole = request.user.role;

        return this.projectMembersService.updateMember(
            projectId,
            userId,
            updateProjectMemberDto,
            requesterId,
            requesterRole,
        );
    }

    @Delete(':userId')
    async removeMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Req()
        request: Request & {
            user: {
                sub: number;
                email: string;
                role: UserRole;
            };
        },
    ) {
        const requesterId = request.user.sub;
        const requesterRole = request.user.role;

        return this.projectMembersService.removeMember(
            projectId,
            userId,
            requesterId,
            requesterRole,
        );
    }
}