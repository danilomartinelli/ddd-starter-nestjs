import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SlonikModule, SLONIK_POOL } from '@danilomartinelli/nestjs-slonik';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from '@modules/user/user.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { RequestContextModule } from 'nestjs-request-context';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContextInterceptor, ExceptionInterceptor } from '@repo/core';
import { SecurityModule, LoggingModule, HealthModule } from '@repo/infra';
import { postgresConnectionUri } from './configs/database.config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloArmor } from '@escape.tech/graphql-armor';
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
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      plugins: [...protection.plugins],
      validationRules: [...protection.validationRules],
    }),

    // Modules
    UserModule,
    WalletModule,
  ],
  controllers: [],
  providers: [...interceptors],
})
export class AppModule {}
