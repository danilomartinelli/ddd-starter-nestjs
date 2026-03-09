import { Command, CommandProps } from '@repo/core';

export class TransferFundsCommand extends Command {
  readonly sourceWalletId: string;

  readonly targetWalletId: string;

  readonly amount: number;

  constructor(props: CommandProps<TransferFundsCommand>) {
    super(props);
    this.sourceWalletId = props.sourceWalletId;
    this.targetWalletId = props.targetWalletId;
    this.amount = props.amount;
  }
}
