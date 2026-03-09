import { defineFeature, loadFeature } from 'jest-cucumber';
import { LoginService } from '../login.service';
import { LoginCommand } from '../login.command';
import { InvalidCredentialsError } from '../../../domain/auth.errors';
import { HashedPassword } from '../../../domain/value-objects/hashed-password.value-object';
import { Result } from 'neverthrow';

const feature = loadFeature(
  'src/modules/auth/commands/login/__tests__/login.feature',
);

defineFeature(feature, (test) => {
  let service: LoginService;
  let mockUserRepo: { findOneByEmail: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockRefreshTokenRepo: { insert: jest.Mock };
  let result: Result<any, InvalidCredentialsError>;
  let validPasswordHash: string;

  beforeAll(async () => {
    const hashed = await HashedPassword.create('SecureP@ss1');
    validPasswordHash = hashed.value;
  });

  beforeEach(() => {
    mockUserRepo = {
      findOneByEmail: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };
    mockRefreshTokenRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
    };
    service = new LoginService(
      mockUserRepo as any,
      mockJwtService as any,
      mockRefreshTokenRepo as any,
    );
  });

  test('Successfully logging in', ({ given, when, then }) => {
    given(
      /^a user with email "(.*)" exists with a valid password$/,
      (email: string) => {
        mockUserRepo.findOneByEmail.mockResolvedValue({
          id: 'user-id-123',
          getProps: () => ({
            id: 'user-id-123',
            email,
            role: 'guest',
            passwordHash: validPasswordHash,
          }),
        });
      },
    );

    when(
      /^I execute the login command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        result = await service.execute(new LoginCommand({ email, password }));
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

  test('Failing to login with wrong password', ({ given, when, then }) => {
    given(
      /^a user with email "(.*)" exists with a valid password$/,
      (email: string) => {
        mockUserRepo.findOneByEmail.mockResolvedValue({
          id: 'user-id-123',
          getProps: () => ({
            id: 'user-id-123',
            email,
            role: 'guest',
            passwordHash: validPasswordHash,
          }),
        });
      },
    );

    when(
      /^I execute the login command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        result = await service.execute(new LoginCommand({ email, password }));
      },
    );

    then('the result is an error of type InvalidCredentialsError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidCredentialsError);
      }
    });
  });

  test('Failing to login with non-existent email', ({ given, when, then }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      mockUserRepo.findOneByEmail.mockResolvedValue(null);
    });

    when(
      /^I execute the login command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        result = await service.execute(new LoginCommand({ email, password }));
      },
    );

    then('the result is an error of type InvalidCredentialsError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidCredentialsError);
      }
    });
  });
});
