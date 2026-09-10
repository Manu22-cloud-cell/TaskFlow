import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectAccessService } from './project-access.service.js';

@Module({
  imports: [AuthModule],
  providers: [ProjectsService, ProjectAccessService],
  controllers: [ProjectsController],
  exports: [ProjectAccessService],
})
export class ProjectsModule { }
