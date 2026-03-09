Feature: Register a new user (auth command handler)

  Scenario: Successfully registering a new user
    Given no user with email "john@test.com" exists
    When I execute the register command with email "john@test.com" and password "SecureP@ss1"
    Then the result is ok with access and refresh tokens

  Scenario: Failing to register with existing email
    Given a user with email "john@test.com" already exists
    When I execute the register command with email "john@test.com" and password "SecureP@ss1"
    Then the result is an error of type UserAlreadyExistsError
