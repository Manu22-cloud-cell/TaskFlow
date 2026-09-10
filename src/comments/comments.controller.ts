import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../projects/project-access.service.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
@Controller('tasks/:taskId') @UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) { }

  @Get('comments')
  findAll(@Param('taskId', ParseIntPipe) id: number, @Req() r: Request & { user: AuthenticatedUser }) {
    return this.comments.findAll(id, r.user);
  }

  @Post('comments')
  create(@Param('taskId', ParseIntPipe) id: number, @Body() dto: CreateCommentDto, @Req() r: Request & { user: AuthenticatedUser }) {
    return this.comments.create(id, dto.content, r.user);

  }
  @Patch('comments/:commentId')
  update(@Param('taskId', ParseIntPipe) taskId: number, @Param('commentId', ParseIntPipe) commentId: number, @Body() dto: UpdateCommentDto, @Req() r: Request & { user: AuthenticatedUser }) {
    return this.comments.update(taskId, commentId, dto.content, r.user);
  }
  @Delete('comments/:commentId')
  remove(@Param('taskId', ParseIntPipe) taskId: number, @Param('commentId', ParseIntPipe) commentId: number, @Req() r: Request & { user: AuthenticatedUser }) {
    return this.comments.remove(taskId, commentId, r.user);
  }
  @Get('activity')
  activity(@Param('taskId', ParseIntPipe) id: number, @Req() r: Request & { user: AuthenticatedUser }) {
    return this.comments.activity(id, r.user);
  }
}
