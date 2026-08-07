import { IsInt, IsString, Min } from 'class-validator';

export class PlantDto {
  @IsInt()
  @Min(0)
  x!: number;

  @IsInt()
  @Min(0)
  y!: number;

  @IsString()
  cropTypeId!: string;
}
