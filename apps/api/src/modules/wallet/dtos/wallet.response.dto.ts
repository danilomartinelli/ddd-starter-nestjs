import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@repo/core';

export class WalletResponseDto extends ResponseBase {
  @ApiProperty({
    example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231',
    description: 'User ID that owns this wallet',
  })
  userId: string;

  @ApiProperty({
    example: 1000,
    description: 'Wallet balance in cents',
  })
  balance: number;
}
