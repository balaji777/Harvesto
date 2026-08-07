import { IsString } from 'class-validator';

export class FulfillOrderDto {
  @IsString()
  orderId!: string;
}
