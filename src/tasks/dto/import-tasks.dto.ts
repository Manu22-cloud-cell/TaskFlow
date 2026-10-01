import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ImportTasksDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  csv: string;
}
