import { IsString } from 'class-validator';

export class TestSendDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;
}
