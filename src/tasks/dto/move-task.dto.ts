import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';

import { TaskStatus } from '../../generated/prisma/enums.js';

export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  position: number;
}
