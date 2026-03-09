Feature: Login (auth command handler)

  Scenario: Successfully logging in
    Given a user with email "john@test.com" exists with a valid password
    When I execute the login command with email "john@test.com" and password "SecureP@ss1"
    Then the result is ok with access and refresh tokens

  Scenario: Failing to login with wrong password
    Given a user with email "john@test.com" exists with a valid password
    When I execute the login command with email "john@test.com" and password "WrongPassword"
    Then the result is an error of type InvalidCredentialsError

  Scenario: Failing to login with non-existent email
    Given no user with email "unknown@test.com" exists
    When I execute the login command with email "unknown@test.com" and password "AnyPassword1"
    Then the result is an error of type InvalidCredentialsError
