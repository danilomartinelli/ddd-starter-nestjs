Feature: Transfer funds between wallets (command handler)

  Scenario: Successfully transferring funds
    Given a source wallet with balance 100 and a target wallet with balance 50
    When I execute the transfer funds command for amount 30
    Then the result is ok
    And the source wallet balance is 70
    And the target wallet balance is 80

  Scenario: Failing to transfer with insufficient balance
    Given a source wallet with balance 10 and a target wallet with balance 50
    When I execute the transfer funds command for amount 50
    Then the result is an error of type InsufficientBalanceError

  Scenario: Failing to transfer to same wallet
    Given a source wallet with balance 100
    When I execute the transfer funds command to the same wallet for amount 10
    Then the result is an error of type SameWalletTransferError
