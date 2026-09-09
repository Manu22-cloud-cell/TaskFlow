import { Module } from '@nestjs/common';

import { ProjectMembersService } from './project-members.service.js';
import { ProjectMembersController } from './project-members.controller.js';

@Module({
  providers: [ProjectMembersService],
  controllers: [ProjectMembersController],
})
export class ProjectMembersModule {}