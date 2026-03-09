import {
  Body,
  Controller,
  HttpStatus,
  Post,
  BadRequestException,
  NotFoundException as NotFoundHttpException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { ApiErrorResponse, NotFoundException } from '@repo/core';
import { routesV1 } from '@config/app.routes';
import { TransferFundsCommand } from './transfer-funds.command';
import { TransferFundsRequestDto } from './transfer-funds.request.dto';
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from '../../domain/wallet.errors';

@Controller(routesV1.version)
export class TransferFundsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Funds transferred' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transfer',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wallet not found',
    type: ApiErrorResponse,
  })
  @Post(`${routesV1.wallet.root}/transfer`)
  async transfer(@Body() body: TransferFundsRequestDto): Promise<void> {
    const command = new TransferFundsCommand(body);
    const result: Result<
      void,
      InsufficientBalanceError | SameWalletTransferError | NotFoundException
    > = await this.commandBus.execute(command);

    result.match(
      () => undefined,
      (error) => {
        if (error instanceof NotFoundException) {
          throw new NotFoundHttpException(error.message);
        }
        throw new BadRequestException(error.message);
      },
    );
  }
}
