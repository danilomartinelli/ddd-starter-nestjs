import { UserWalletSummaryProjector } from '../user-wallet-summary.projector';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { WalletCreatedDomainEvent } from '@modules/wallet/domain/events/wallet-created.domain-event';

describe('UserWalletSummaryProjector', () => {
  let projector: UserWalletSummaryProjector;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    projector = new UserWalletSummaryProjector(mockPool as any);
  });

  describe('onUserCreated', () => {
    it('inserts a user wallet summary row', async () => {
      const event = new UserCreatedDomainEvent({
        aggregateId: 'user-123',
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      });

      await projector.onUserCreated(event);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('onWalletCreated', () => {
    it('updates the user wallet summary with wallet info', async () => {
      const event = new WalletCreatedDomainEvent({
        aggregateId: 'wallet-456',
        userId: 'user-123',
      });

      await projector.onWalletCreated(event);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });
});
