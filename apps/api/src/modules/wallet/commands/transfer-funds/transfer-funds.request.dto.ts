import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class TransferFundsRequestDto {
  @ApiProperty({
    example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231',
    description: 'Source wallet ID',
  })
  @IsUUID()
  readonly sourceWalletId: string;

  @ApiProperty({
    example: '3bdf9ab2-7e61-50dd-cb25-65f5bd8fc342',
    description: 'Target wallet ID',
  })
  @IsUUID()
  readonly targetWalletId: string;

  @ApiProperty({
    example: 100,
    description: 'Amount to transfer (integer, in cents)',
  })
  @IsInt()
  @IsPositive()
  readonly amount: number;
}
