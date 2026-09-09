import { IsEnum } from 'class-validator';

import { ProjectMemberRole } from '../../generated/prisma/enums.js';

export class UpdateProjectMemberDto {
  @IsEnum(ProjectMemberRole)
  role: ProjectMemberRole;
}