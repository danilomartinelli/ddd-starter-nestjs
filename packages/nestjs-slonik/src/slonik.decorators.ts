import { Inject } from '@nestjs/common';
import { SLONIK_POOL } from './slonik.constants';

export const InjectPool = (): ParameterDecorator => Inject(SLONIK_POOL);
