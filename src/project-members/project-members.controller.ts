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
import { AuthenticatedUser } from '../projects/project-access.service.js';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
    constructor(
        private readonly projectMembersService: ProjectMembersService,
    ) { }

    @Get()
    async findMembers(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Req() request: Request & { user: AuthenticatedUser },
    ) {
        return this.projectMembersService.findMembers(
            projectId,
            request.user,
        );
    }

    @Post()
    async addMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() addProjectMemberDto: AddProjectMemberDto,
        @Req() request: Request & { user: AuthenticatedUser },
    ) {
        return this.projectMembersService.addMember(
            projectId,
            addProjectMemberDto,
            request.user,
        );
    }

    @Patch(':userId')
    async updateMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() updateProjectMemberDto: UpdateProjectMemberDto,
        @Req()
        request: Request & {
            user: AuthenticatedUser;
        },
    ) {
        return this.projectMembersService.updateMember(
            projectId,
            userId,
            updateProjectMemberDto,
            request.user,
        );
    }

    @Delete(':userId')
    async removeMember(
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Req()
        request: Request & {
            user: AuthenticatedUser;
        },
    ) {
        return this.projectMembersService.removeMember(
            projectId,
            userId,
            request.user,
        );
    }
}
