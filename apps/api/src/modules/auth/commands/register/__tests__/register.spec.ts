import { defineFeature, loadFeature } from 'jest-cucumber';
import { RegisterService } from '../register.service';
import { RegisterCommand } from '../register.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { Result, ok, err } from 'neverthrow';

const feature = loadFeature(
  'src/modules/auth/commands/register/__tests__/register.feature',
);

defineFeature(feature, (test) => {
  let service: RegisterService;
  let mockCommandBus: { execute: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockRefreshTokenRepo: { insert: jest.Mock };
  let result: Result<any, UserAlreadyExistsError>;

  beforeEach(() => {
    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(ok('generated-user-id')),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };
    mockRefreshTokenRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
    };
    service = new RegisterService(
      mockCommandBus as any,
      mockJwtService as any,
      mockRefreshTokenRepo as any,
    );
  });

  test('Successfully registering a new user', ({ given, when, then }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      // Default mock succeeds
    });

    when(
      /^I execute the register command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const command = new RegisterCommand({
          email,
          password,
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        });
        result = await service.execute(command);
      },
    );

    then('the result is ok with access and refresh tokens', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
        expect(result.value.expiresIn).toBe(3600);
      }
    });
  });

  test('Failing to register with existing email', ({ given, when, then }) => {
    given(/^a user with email "(.*)" already exists$/, () => {
      mockCommandBus.execute.mockResolvedValue(
        err(new UserAlreadyExistsError()),
      );
    });

    when(
      /^I execute the register command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const command = new RegisterCommand({
          email,
          password,
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
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
});
