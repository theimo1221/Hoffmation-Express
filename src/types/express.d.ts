import type { Principal } from './principal';

declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}
