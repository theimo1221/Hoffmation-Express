import { Role } from './role';
import { DenyPolicy } from './deny-policy';

export interface UserRec {
  username: string;
  role: Role;
  pwHash: string;
  disabled?: boolean;
  deny?: DenyPolicy;
  scope?: string[] | null;
  createdAt?: string;
  lastLogin?: string | null;
}
