import { apiPost, apiGet, apiPatch, apiDelete } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  role: 'admin' | 'control' | 'webhook';
}

export interface User {
  username: string;
  role: 'admin' | 'control' | 'webhook';
  disabled?: boolean;
  deny?: {
    rooms?: string[];
    floors?: number[];
    deviceClasses?: string[];
  };
  createdAt?: string;
  lastLogin?: string | null;
}

export interface Token {
  label: string;
  role: 'admin' | 'control' | 'webhook';
  disabled?: boolean;
  validUntil?: string | null;
  deny?: {
    rooms?: string[];
    floors?: number[];
    deviceClasses?: string[];
  };
  scope?: string[] | null;
  createdAt?: string;
  lastUsed?: string | null;
}

export interface MintTokenResponse {
  label: string;
  token: string;
  note: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { username, password });
}

export async function logout(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/auth/logout', {});
}

export async function getAuthMode(): Promise<{ mode: 'optional' | 'enforced' }> {
  return apiGet<{ mode: 'optional' | 'enforced' }>('/auth/mode');
}

export async function getUsers(): Promise<User[]> {
  return apiGet<User[]>('/auth/users');
}

export async function createUser(user: { username: string; password: string; role: string; deny?: any }): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/auth/users', user);
}

export async function updateUser(username: string, updates: { role?: string; deny?: any; disabled?: boolean; password?: string }): Promise<{ success: boolean }> {
  return apiPatch<{ success: boolean }>(`/auth/users/${encodeURIComponent(username)}`, updates);
}

export async function deleteUser(username: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/auth/users/${encodeURIComponent(username)}`);
}

export async function getTokens(): Promise<Token[]> {
  return apiGet<Token[]>('/auth/tokens');
}

export async function mintToken(label: string, role: string, deny?: any, scope?: string[]): Promise<MintTokenResponse> {
  return apiPost<MintTokenResponse>('/auth/tokens', { label, role, deny, scope });
}

export async function revokeToken(label: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/auth/tokens/${encodeURIComponent(label)}`);
}

export async function setAuthMode(mode: 'optional' | 'enforced'): Promise<{ mode: string }> {
  return apiPost<{ mode: string }>('/auth/mode', { mode });
}
