import { IsEnum, IsOptional } from 'class-validator';

import { ListPaginationDto } from '../../common/dto/list-pagination.dto.js';
import { ProjectStatus } from '../../generated/prisma/enums.js';

export class ListProjectsDto extends ListPaginationDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
