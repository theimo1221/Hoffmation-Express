const MOBILE_TOKEN_KEY = 'hf_mobile_token';

function getBaseUrl(): string {
  // API endpoints are always at root (e.g., /rooms, /devices)
  // Allow overriding the full base URL (e.g., 'https://hoffmation.com' or empty for same origin)
  const override = localStorage.getItem('hoffmation-api-url');
  if (override) {
    return override;
  }
  // Default: Use current origin (works from any path like /ui/)
  return window.location.origin;
}

/** In-flight recovery, so a burst of parallel 401s exchanges the token once, not once each. */
let recovery: Promise<boolean> | null = null;

/**
 * Trades the stored mobile token for a fresh session.
 *
 * Server sessions live in memory, so every restart invalidates them while the client still
 * holds a valid-looking cookie. Without this the next request just bounced to the login
 * screen and the token had to be typed in again.
 */
async function tryMobileTokenRecovery(): Promise<boolean> {
  const token = localStorage.getItem(MOBILE_TOKEN_KEY);
  if (!token) return false;

  recovery ??= (async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/auth/mobile-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      // 401 means the token itself is gone or revoked - nothing left to recover with.
      if (res.status === 401) localStorage.removeItem(MOBILE_TOKEN_KEY);
      return res.ok;
    } catch {
      return false;
    } finally {
      recovery = null;
    }
  })();

  return recovery;
}

function redirectToLogin(): void {
  if (window.location.pathname !== '/login' && window.location.pathname !== '/ui/login') {
    window.location.href = '/ui/login';
  }
}

/**
 * Performs a request, recovering a dropped session once before giving up.
 *
 * Every API call goes through here so the retry cannot be forgotten at a call site.
 */
async function request(endpoint: string, init: RequestInit): Promise<Response> {
  const url = `${getBaseUrl()}${endpoint}`;
  const options: RequestInit = { credentials: 'include', ...init };

  let response = await fetch(url, options);
  if (response.status === 401 && (await tryMobileTokenRecovery())) {
    response = await fetch(url, options);
  }
  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }
  return response;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} for ${url}`);
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await request(endpoint, {});
  assertOk(response, endpoint);
  return response.json();
}

export async function apiGetNoResponse(endpoint: string): Promise<void> {
  const response = await request(endpoint, {});
  assertOk(response, endpoint);
  // Don't try to parse response body
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await request(endpoint, jsonInit('POST', body));
  assertOk(response, endpoint);
  return response.json();
}

export async function apiPostNoResponse(endpoint: string, body: unknown): Promise<void> {
  const response = await request(endpoint, jsonInit('POST', body));
  if (!response.ok) {
    // Surface the body: these endpoints answer with a plain-text reason.
    let errorMessage = `API error: ${response.status} ${response.statusText} for ${endpoint}`;
    try {
      const text = await response.text();
      if (text) errorMessage += `: ${text}`;
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorMessage);
  }
  // Don't try to parse success response body
}

export async function apiPatch<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await request(endpoint, jsonInit('PATCH', body));
  assertOk(response, endpoint);
  return response.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await request(endpoint, { method: 'DELETE' });
  assertOk(response, endpoint);
  return response.json();
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem('hoffmation-api-url', url);
}

export function getApiBaseUrl(): string {
  return localStorage.getItem('hoffmation-api-url') || window.location.origin;
}
