import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindUserWalletSummaryRequestDto {
  @ApiProperty({
    example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231',
    description: 'User ID to lookup summary for',
  })
  @IsUUID()
  readonly userId: string;
}
