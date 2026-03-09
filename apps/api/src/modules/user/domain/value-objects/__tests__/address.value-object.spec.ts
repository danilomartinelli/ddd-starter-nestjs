import { ArgumentOutOfRangeException } from '@repo/core';
import { Address } from '../address.value-object';

describe('Address', () => {
  const validProps = {
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
  };

  describe('creation', () => {
    it('creates with valid props', () => {
      const address = new Address(validProps);
      expect(address.country).toBe('England');
      expect(address.postalCode).toBe('28566');
      expect(address.street).toBe('Grand Avenue');
    });

    it('unpacks to props object', () => {
      const address = new Address(validProps);
      expect(address.unpack()).toEqual(validProps);
    });
  });

  describe('validation — country', () => {
    it('accepts country at minimum length (2 chars)', () => {
      expect(() => new Address({ ...validProps, country: 'UK' })).not.toThrow();
    });

    it('accepts country at maximum length (50 chars)', () => {
      expect(
        () => new Address({ ...validProps, country: 'A'.repeat(50) }),
      ).not.toThrow();
    });

    it('rejects country shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, country: 'A' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects country longer than 50 chars', () => {
      expect(
        () => new Address({ ...validProps, country: 'A'.repeat(51) }),
      ).toThrow(ArgumentOutOfRangeException);
    });
  });

  describe('validation — street', () => {
    it('accepts street at minimum length (2 chars)', () => {
      expect(() => new Address({ ...validProps, street: 'AB' })).not.toThrow();
    });

    it('accepts street at maximum length (50 chars)', () => {
      expect(
        () => new Address({ ...validProps, street: 'A'.repeat(50) }),
      ).not.toThrow();
    });

    it('rejects street shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, street: 'A' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects street longer than 50 chars', () => {
      expect(
        () => new Address({ ...validProps, street: 'A'.repeat(51) }),
      ).toThrow(ArgumentOutOfRangeException);
    });
  });

  describe('validation — postalCode', () => {
    it('accepts postalCode at minimum length (2 chars)', () => {
      expect(
        () => new Address({ ...validProps, postalCode: '12' }),
      ).not.toThrow();
    });

    it('accepts postalCode at maximum length (10 chars)', () => {
      expect(
        () => new Address({ ...validProps, postalCode: '1234567890' }),
      ).not.toThrow();
    });

    it('rejects postalCode shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, postalCode: '1' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects postalCode longer than 10 chars', () => {
      expect(
        () => new Address({ ...validProps, postalCode: '12345678901' }),
      ).toThrow(ArgumentOutOfRangeException);
    });
  });

  describe('equality', () => {
    it('two addresses with same props are equal', () => {
      const a = new Address(validProps);
      const b = new Address(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('two addresses with different props are not equal', () => {
      const a = new Address(validProps);
      const b = new Address({ ...validProps, country: 'France' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
