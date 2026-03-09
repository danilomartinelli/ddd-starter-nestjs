import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { UserRoles } from '@modules/user/domain/user.types';

const TEST_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashedvalue';

export class UserBuilder {
  private email = 'test@example.com';
  private country = 'England';
  private postalCode = '28566';
  private street = 'Grand Avenue';
  private role?: UserRoles;
  private passwordHash = TEST_PASSWORD_HASH;

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withCountry(country: string): this {
    this.country = country;
    return this;
  }

  withPostalCode(postalCode: string): this {
    this.postalCode = postalCode;
    return this;
  }

  withStreet(street: string): this {
    this.street = street;
    return this;
  }

  withRole(role: UserRoles): this {
    this.role = role;
    return this;
  }

  withPasswordHash(passwordHash: string): this {
    this.passwordHash = passwordHash;
    return this;
  }

  build(): UserEntity {
    const user = UserEntity.create({
      email: this.email,
      address: new Address({
        country: this.country,
        postalCode: this.postalCode,
        street: this.street,
      }),
      passwordHash: this.passwordHash,
    });

    if (this.role === UserRoles.admin) user.makeAdmin();
    if (this.role === UserRoles.moderator) user.makeModerator();

    return user;
  }
}
