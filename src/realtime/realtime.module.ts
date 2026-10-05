import { forwardRef, Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { PushModule } from '../push/push.module.js';

@Module({
  imports: [forwardRef(() => ProjectsModule), PushModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
