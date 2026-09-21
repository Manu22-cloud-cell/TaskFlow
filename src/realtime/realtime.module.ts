import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [ProjectsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
