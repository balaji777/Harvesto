import { IsInt, IsString, Min } from 'class-validator';

export class BuyListingDto {
  @IsString()
  listingId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
