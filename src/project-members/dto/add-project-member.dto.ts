import { IsInt, Min } from 'class-validator';

export class AddProjectMemberDto {
  @IsInt()
  @Min(1)
  userId: number;
}