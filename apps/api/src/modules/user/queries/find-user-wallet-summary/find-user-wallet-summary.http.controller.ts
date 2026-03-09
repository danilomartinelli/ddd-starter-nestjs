import {
  Controller,
  Get,
  HttpStatus,
  Param,
  NotFoundException as NotFoundHttpException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { routesV1 } from '@config/app.routes';
import {
  FindUserWalletSummaryQuery,
  UserWalletSummaryReadModel,
} from './find-user-wallet-summary.query-handler';

@Controller(routesV1.version)
export class FindUserWalletSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(`${routesV1.user.root}/:id/wallet-summary`)
  @ApiOperation({ summary: 'Get user wallet summary (read model)' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findSummary(
    @Param('id') userId: string,
  ): Promise<UserWalletSummaryReadModel> {
    const result: Result<UserWalletSummaryReadModel | null, Error> =
      await this.queryBus.execute(new FindUserWalletSummaryQuery({ userId }));

    return result.match(
      (data) => {
        if (!data) {
          throw new NotFoundHttpException('User wallet summary not found');
        }
        return data;
      },
      (error) => {
        throw error;
      },
    );
  }
}
