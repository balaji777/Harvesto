import { IsString } from 'class-validator';

export class ClaimMissionDto {
  @IsString()
  assignmentId!: string;
}
