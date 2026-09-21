import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectMembersController } from './project-members.controller.js';

@Module({
  imports: [ProjectsModule, RealtimeModule],
  providers: [ProjectMembersService],
  controllers: [ProjectMembersController],
})
export class ProjectMembersModule {}
