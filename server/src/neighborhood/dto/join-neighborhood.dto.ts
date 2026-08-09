import { IsString } from 'class-validator';

export class JoinNeighborhoodDto {
  @IsString()
  neighborhoodId!: string;
}
