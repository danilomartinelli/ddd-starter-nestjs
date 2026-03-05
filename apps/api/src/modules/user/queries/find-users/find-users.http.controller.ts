import { Body, Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { routesV1 } from '@config/app.routes';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { FindUsersRequestDto } from './find-users.request.dto';
import { FindUsersQuery } from './find-users.query-handler';
import { Paginated, PaginatedQueryRequestDto, ResponseBase } from '@repo/core';
import { UserPaginatedResponseDto } from '../../dtos/user.paginated.response.dto';
import { UserModel } from '../../database/user.repository';

@Controller(routesV1.version)
export class FindUsersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(routesV1.user.root)
  @ApiOperation({ summary: 'Find users' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserPaginatedResponseDto,
  })
  async findUsers(
    @Body() request: FindUsersRequestDto,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<UserPaginatedResponseDto> {
    const query = new FindUsersQuery({
      ...request,
      limit: queryParams?.limit,
      page: queryParams?.page,
    });
    const result: Result<
      Paginated<UserModel>,
      Error
    > = await this.queryBus.execute(query);

    const paginated = result.match(
      (data) => data,
      (error) => {
        throw error;
      },
    );

    // Whitelisting returned properties
    return new UserPaginatedResponseDto({
      ...paginated,
      data: paginated.data.map((user) => ({
        ...new ResponseBase(user),
        email: user.email,
        country: user.country,
        street: user.street,
        postalCode: user.postalCode,
      })),
    });
  }
}
