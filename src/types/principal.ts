import { Role } from './role';
import { DenyPolicy } from './deny-policy';

export interface Principal {
  name: string;
  role: Role;
  deny?: DenyPolicy;
  scope?: string[] | null;
  via: 'bearer' | 'cookie' | 'query';
}
