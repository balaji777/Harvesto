import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNeighborhoodDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  name!: string;
}
