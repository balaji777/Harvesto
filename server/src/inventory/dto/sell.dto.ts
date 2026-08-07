import { IsInt, IsString, Min } from 'class-validator';

export class SellDto {
  @IsString()
  itemTypeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
