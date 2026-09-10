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
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { MoveTaskDto } from './dto/move-task.dto.js';
import { TasksService } from './tasks.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../projects/project-access.service.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.create(createTaskDto, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.tasksService.findAll(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.findOne(Number(id), request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body() moveTaskDto: MoveTaskDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.move(
      Number(id),
      moveTaskDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.update(
      Number(id),
      updateTaskDto,
      request.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.tasksService.remove(Number(id), request.user);
  }
}
