import { IsEnum, IsString } from 'class-validator';
import { IapStore } from '@prisma/client';

export class SubmitReceiptDto {
  @IsEnum(IapStore)
  store!: IapStore;

  @IsString()
  productId!: string;

  @IsString()
  receiptToken!: string;
}
