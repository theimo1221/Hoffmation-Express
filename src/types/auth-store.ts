import { AuthMode } from './auth-mode';
import { UserRec } from './user-rec';
import { TokenRec } from './token-rec';

export interface AuthStore {
  version: number;
  mode: AuthMode;
  sessionTtlMinutes?: number;
  users: UserRec[];
  tokens: TokenRec[];
}
