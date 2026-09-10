import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';

@Module({
  imports: [ProjectsModule],
  providers: [TasksService],
  controllers: [TasksController]
})
export class TasksModule {}
