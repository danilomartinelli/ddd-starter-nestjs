import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRoles } from '@modules/user/domain/user.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoles[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
