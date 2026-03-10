import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SlonikModule, SLONIK_POOL } from '@danilomartinelli/nestjs-slonik';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from '@modules/user/user.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { AuthDomainModule } from '@modules/auth/auth.module';
import { RequestContextModule } from 'nestjs-request-context';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ContextInterceptor, ExceptionInterceptor } from '@repo/core';
import {
  SecurityModule,
  LoggingModule,
  HealthModule,
  IdempotencyModule,
  CircuitBreakerModule,
  DeadLetterModule,
  QueueModule,
  SchedulerModule,
  OutboxModule,
  EventBusModule,
} from '@repo/infra';
import { AuthModule } from '@src/infrastructure/auth/auth.module';
import { GqlAuthGuard } from '@src/infrastructure/auth/gql-auth.guard';
import { RolesGuard } from '@src/infrastructure/auth/roles.guard';
import { postgresConnectionUri } from './configs/database.config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloArmor } from '@escape.tech/graphql-armor';
import {
  formatGraphqlError,
  createGraphqlErrorFormatterPlugin,
} from '@src/infrastructure/graphql/graphql-error-formatter.plugin';
import { get } from 'env-var';

const armor = new ApolloArmor({
  maxDepth: {
    n: parseInt(process.env.GQL_MAX_DEPTH || '10', 10),
  },
  costLimit: {
    maxCost: parseInt(process.env.GQL_MAX_COMPLEXITY || '1000', 10),
  },
  maxAliases: {
    n: parseInt(process.env.GQL_MAX_ALIASES || '15', 10),
  },
  blockFieldSuggestion: {
    enabled: true,
  },
});

const protection = armor.protect();

const interceptors = [
  {
    provide: APP_INTERCEPTOR,
    useClass: ContextInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ExceptionInterceptor,
  },
];

const guards = [
  {
    provide: APP_GUARD,
    useClass: GqlAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
];

@Module({
  imports: [
    // Infrastructure
    SecurityModule.forRoot({
      ttl: get('THROTTLE_TTL').default(60000).asIntPositive(),
      limit: get('THROTTLE_LIMIT').default(100).asIntPositive(),
    }),
    LoggingModule.forRoot({
      level: get('LOG_LEVEL').default('info').asString(),
      prettyPrint: get('LOG_PRETTY').default('false').asBool(),
    }),

    // Existing
    EventEmitterModule.forRoot(),
    RequestContextModule,
    SlonikModule.forRoot({
      connectionUri: postgresConnectionUri,
      isGlobal: true,
    }),
    HealthModule.forRoot(SLONIK_POOL, { version: '2.0.0' }),
    IdempotencyModule.forRoot(),
    CircuitBreakerModule.forRoot(),
    DeadLetterModule.forRoot(),
    QueueModule.forRoot({
      redisHost: get('REDIS_HOST').default('localhost').asString(),
      redisPort: get('REDIS_PORT').default(6379).asIntPositive(),
      redisPassword: get('REDIS_PASSWORD').default('').asString(),
    }),
    SchedulerModule.forRoot(),
    OutboxModule.forRoot(),
    EventBusModule.forRoot(),
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      formatError: formatGraphqlError,
      plugins: [...protection.plugins, createGraphqlErrorFormatterPlugin()],
      validationRules: [...protection.validationRules],
    }),

    // Auth
    AuthModule,

    // Modules
    UserModule,
    WalletModule,
    AuthDomainModule,
  ],
  controllers: [],
  providers: [...interceptors, ...guards],
})
export class AppModule {}
