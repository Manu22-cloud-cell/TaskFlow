import { IsEnum } from 'class-validator';

import { TaskStatus } from '../../generated/prisma/enums.js';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
