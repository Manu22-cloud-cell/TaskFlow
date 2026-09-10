import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../projects/project-access.service.js';
import { ListProjectTasksDto } from './dto/list-project-tasks.dto.js';
import { TasksService } from './tasks.service.js';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() filters: ListProjectTasksDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.findByProject(
      projectId,
      filters,
      request.user,
    );
  }
}
