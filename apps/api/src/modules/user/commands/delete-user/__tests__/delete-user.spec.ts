import { defineFeature, loadFeature } from 'jest-cucumber';
import { DeleteUserCommand } from '../delete-user.command';
import { DeleteUserService } from '../delete-user.service';
import { NotFoundException } from '@repo/core';
import { Result } from 'neverthrow';
import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';

const feature = loadFeature(
  'src/modules/user/commands/delete-user/__tests__/delete-user.feature',
);

defineFeature(feature, (test) => {
  let service: DeleteUserService;
  let mockRepo: {
    insert: jest.Mock;
    findOneById: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<boolean, NotFoundException>;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn(),
      findOneById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
      transaction: jest.fn(),
    };
    service = new DeleteUserService(mockRepo as any);
  });

  test('Successfully deleting an existing user', ({ given, when, then }) => {
    given(/^a user exists with ID "(.*)"$/, () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: new Address({
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        }),
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
      });
      mockRepo.findOneById.mockResolvedValue(user);
    });

    when(
      /^I execute the delete user command for "(.*)"$/,
      async (userId: string) => {
        result = await service.execute(new DeleteUserCommand({ userId }));
      },
    );

    then('the result is ok with true', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  test('Failing to delete a non-existent user', ({ given, when, then }) => {
    given(/^no user exists with ID "(.*)"$/, () => {
      mockRepo.findOneById.mockResolvedValue(undefined);
    });

    when(
      /^I execute the delete user command for "(.*)"$/,
      async (userId: string) => {
        result = await service.execute(new DeleteUserCommand({ userId }));
      },
    );

    then('the result is an error of type NotFoundException', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  test('Repository throws an unexpected error during delete', ({
    given,
    when,
    then,
    and,
  }) => {
    let thrownError: Error | undefined;

    given(/^a user exists with ID "(.*)"$/, () => {
      const user = UserEntity.create({
        email: 'test@example.com',
        address: new Address({
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        }),
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue',
      });
      mockRepo.findOneById.mockResolvedValue(user);
    });

    and('the repository will throw during delete', () => {
      mockRepo.delete.mockRejectedValue(new Error('DB connection lost'));
    });

    when(
      /^I execute the delete user command for "(.*)"$/,
      async (userId: string) => {
        try {
          await service.execute(new DeleteUserCommand({ userId }));
        } catch (e) {
          thrownError = e as Error;
        }
      },
    );

    then('the unexpected error is propagated', () => {
      expect(thrownError).toBeDefined();
      expect((thrownError as Error).message).toBe('DB connection lost');
    });
  });
});
