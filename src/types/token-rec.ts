import { Role } from './role';
import { DenyPolicy } from './deny-policy';

export interface TokenRec {
  label: string;
  role: Role;
  tokenHash: string;
  disabled?: boolean;
  validUntil?: string | null;
  deny?: DenyPolicy;
  scope?: string[] | null;
  createdAt?: string;
  lastUsed?: string | null;
}
