import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [ProjectsModule, RealtimeModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
