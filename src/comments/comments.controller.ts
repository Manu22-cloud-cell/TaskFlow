import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../projects/project-access.service.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { ListTaskFeedDto } from './dto/list-task-feed.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';

@Controller('tasks/:taskId')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('comments')
  findAll(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query() pagination: ListTaskFeedDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.comments.findAll(taskId, pagination, request.user);
  }

  @Post('comments')
  create(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CreateCommentDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.comments.create(taskId, dto.content, request.user);
  }

  @Patch('comments/:commentId')
  update(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.comments.update(taskId, commentId, dto.content, request.user);
  }

  @Delete('comments/:commentId')
  remove(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.comments.remove(taskId, commentId, request.user);
  }

  @Get('activity')
  activity(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query() pagination: ListTaskFeedDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.comments.activity(taskId, pagination, request.user);
  }
}
