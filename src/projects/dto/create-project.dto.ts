import {
  IsEnum,
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProjectStatus } from '../../generated/prisma/enums.js';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  ownerId?: number;
}
