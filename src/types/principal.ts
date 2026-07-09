import { Role } from './role';
import { DenyPolicy } from './deny-policy';

export interface Principal {
  name: string;
  role: Role;
  deny?: DenyPolicy;
  via: 'bearer' | 'cookie' | 'query';
}
