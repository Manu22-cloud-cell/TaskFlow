import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../projects/project-access.service.js';
import { ListProjectTasksDto } from './dto/list-project-tasks.dto.js';
import { TasksService } from './tasks.service.js';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('export')
  async exportCsv(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() filters: ListProjectTasksDto,
    @Req() request: Request & { user: AuthenticatedUser },
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.tasksService.exportByProject(
      projectId,
      filters,
      request.user,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="project-${projectId}-tasks.csv"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    return csv;
  }

  @Get()
  async findByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() filters: ListProjectTasksDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.findByProject(projectId, filters, request.user);
  }
}
