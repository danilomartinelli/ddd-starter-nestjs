import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLFormattedError } from 'graphql';
import { Logger } from '@nestjs/common';
import { RequestContextService } from '@repo/core';

const logger = new Logger('GraphQLErrorFormatter');

export function createGraphqlErrorFormatterPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors(requestContext) {
          for (const error of requestContext.errors) {
            logger.error(
              {
                message: error.message,
                path: error.path,
                extensions: error.extensions,
                stack: error.originalError?.stack,
              },
              'GraphQL Error',
            );
          }
        },
      };
    },
  };
}

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
): GraphQLFormattedError {
  const isProduction = process.env.NODE_ENV === 'production';

  let correlationId: string;
  try {
    correlationId = RequestContextService.getRequestId();
  } catch {
    correlationId = 'unknown';
  }

  return {
    message: formattedError.message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: {
      code: formattedError.extensions?.code || 'INTERNAL_SERVER_ERROR',
      correlationId,
      ...(isProduction
        ? {}
        : { stacktrace: formattedError.extensions?.stacktrace }),
    },
  };
}
