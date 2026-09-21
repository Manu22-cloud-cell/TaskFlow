import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { ProjectTasksController } from './project-tasks.controller.js';

@Module({
  imports: [ProjectsModule, RealtimeModule],
  providers: [TasksService],
  controllers: [TasksController, ProjectTasksController],
})
export class TasksModule {}
