import { IsString } from 'class-validator';

export class AnimalIdDto {
  @IsString()
  animalId!: string;
}
