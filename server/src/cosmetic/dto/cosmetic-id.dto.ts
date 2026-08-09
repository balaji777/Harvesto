import { IsString } from 'class-validator';

export class CosmeticIdDto {
  @IsString()
  cosmeticTypeId!: string;
}
