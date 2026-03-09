import { Logger, Module, Provider } from '@nestjs/common';
import { UserRepository } from './database/user.repository';
import { CreateUserHttpController } from './commands/create-user/create-user.http.controller';
import { DeleteUserHttpController } from './commands/delete-user/delete-user.http-controller';
import { FindUsersHttpController } from './queries/find-users/find-users.http.controller';
import { CreateUserMessageController } from './commands/create-user/create-user.message.controller';
import { CreateUserCliController } from './commands/create-user/create-user.cli.controller';
import { CreateUserGraphqlResolver } from './commands/create-user/graphql-example/create-user.graphql-resolver';
import { CreateUserService } from './commands/create-user/create-user.service';
import { DeleteUserService } from './commands/delete-user/delete-user.service';
import { FindUsersQueryHandler } from './queries/find-users/find-users.query-handler';
import { UserMapper } from './user.mapper';
import { CqrsModule } from '@nestjs/cqrs';
import { USER_REPOSITORY, SAGA_REPOSITORY } from './user.di-tokens';
import { FindUsersGraphqlResolver } from './queries/find-users/find-users.graphql-resolver';
import { SagaRepository } from './database/saga.repository';
import { SagaMapper } from './application/sagas/saga.mapper';
import { UserRegistrationSagaHandler } from './application/sagas/saga-event-handlers';
import { UserWalletSummaryProjector } from './application/projections/user-wallet-summary.projector';
import { FindUserWalletSummaryQueryHandler } from './queries/find-user-wallet-summary/find-user-wallet-summary.query-handler';
import { FindUserWalletSummaryHttpController } from './queries/find-user-wallet-summary/find-user-wallet-summary.http.controller';

const httpControllers = [
  CreateUserHttpController,
  DeleteUserHttpController,
  FindUsersHttpController,
  FindUserWalletSummaryHttpController,
];

const messageControllers = [CreateUserMessageController];

const cliControllers: Provider[] = [CreateUserCliController];

const graphqlResolvers: Provider[] = [
  CreateUserGraphqlResolver,
  FindUsersGraphqlResolver,
];

const commandHandlers: Provider[] = [CreateUserService, DeleteUserService];

const queryHandlers: Provider[] = [
  FindUsersQueryHandler,
  FindUserWalletSummaryQueryHandler,
];

const mappers: Provider[] = [UserMapper, SagaMapper];

const repositories: Provider[] = [
  { provide: USER_REPOSITORY, useClass: UserRepository },
  { provide: SAGA_REPOSITORY, useClass: SagaRepository },
];

const sagaHandlers: Provider[] = [UserRegistrationSagaHandler];

const projectors: Provider[] = [UserWalletSummaryProjector];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers, ...messageControllers],
  providers: [
    Logger,
    ...cliControllers,
    ...repositories,
    ...graphqlResolvers,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
    ...sagaHandlers,
    ...projectors,
  ],
})
export class UserModule {}
