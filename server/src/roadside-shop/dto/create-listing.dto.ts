import { IsInt, IsString, Min } from 'class-validator';

export class CreateListingDto {
  @IsString()
  itemTypeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(1)
  priceCoins!: number;
}
