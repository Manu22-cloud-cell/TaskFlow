import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';

@Module({
  imports: [AuthModule],
  providers: [ProjectsService],
  controllers: [ProjectsController]
})
export class ProjectsModule { }
