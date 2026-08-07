import { IsString } from 'class-validator';

export class CollectQueueEntryDto {
  @IsString()
  queueEntryId!: string;
}
