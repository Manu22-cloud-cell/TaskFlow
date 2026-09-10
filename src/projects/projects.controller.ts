import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AuthenticatedUser } from './project-access.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.projectsService.findAll(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.projectsService.findOne(Number(id), request.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.projectsService.create(createProjectDto, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.projectsService.update(
      Number(id),
      updateProjectDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.projectsService.remove(Number(id), request.user);
  }
}
