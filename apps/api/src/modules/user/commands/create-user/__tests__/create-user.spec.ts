import { defineFeature, loadFeature } from 'jest-cucumber';
import { CreateUserService } from '../create-user.service';
import { CreateUserCommand } from '../create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { ConflictException } from '@repo/core';
import { Result } from 'neverthrow';

const feature = loadFeature(
  'src/modules/user/commands/create-user/__tests__/create-user.feature',
);

defineFeature(feature, (test) => {
  let service: CreateUserService;
  let mockRepo: {
    insert: jest.Mock;
    findOneById: jest.Mock;
    findOneByEmail: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<string, UserAlreadyExistsError>;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
      findOneById: jest.fn(),
      findOneByEmail: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
    };
    service = new CreateUserService(mockRepo as any);
  });

  test('Successfully creating a new user', ({ given, when, then, and }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      // Default mock: insert succeeds
    });

    when(
      /^I execute the create user command with email "(.*)"$/,
      async (email: string) => {
        const command = new CreateUserCommand({
          email,
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
          passwordHash:
            '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
        });
        result = await service.execute(command);
      },
    );

    then('the result is ok with an aggregate ID', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    and('a UserCreatedDomainEvent was published via the repository', () => {
      expect(mockRepo.transaction).toHaveBeenCalled();
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  test('Failing to create a user with a duplicate email', ({
    given,
    when,
    then,
  }) => {
    given(/^a user with email "(.*)" already exists$/, () => {
      mockRepo.insert.mockRejectedValue(
        new ConflictException('Record already exists'),
      );
    });

    when(
      /^I execute the create user command with email "(.*)"$/,
      async (email: string) => {
        const command = new CreateUserCommand({
          email,
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
          passwordHash:
            '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
        });
        result = await service.execute(command);
      },
    );

    then('the result is an error of type UserAlreadyExistsError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UserAlreadyExistsError);
      }
    });
  });

  test('Repository throws an unexpected error', ({ given, when, then }) => {
    let thrownError: Error | undefined;

    given('the repository will throw an unexpected error', () => {
      mockRepo.insert.mockRejectedValue(new Error('Connection lost'));
    });

    when(
      /^I execute the create user command with email "(.*)"$/,
      async (email: string) => {
        try {
          const command = new CreateUserCommand({
            email,
            country: 'England',
            postalCode: '28566',
            street: 'Grand Avenue',
            passwordHash:
              '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
          });
          await service.execute(command);
        } catch (e) {
          thrownError = e as Error;
        }
      },
    );

    then('the unexpected error is propagated', () => {
      expect(thrownError).toBeDefined();
      expect((thrownError as Error).message).toBe('Connection lost');
    });
  });
});
