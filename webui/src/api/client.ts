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

export async function apiGet<T>(endpoint: string): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

export async function apiGetNoResponse(endpoint: string): Promise<void> {
  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} for ${url}`);
  }
  // Don't try to parse response body
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

export async function apiPostNoResponse(endpoint: string, body: unknown): Promise<void> {
  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Try to get error message from response body
    let errorMessage = `API error: ${response.status} ${response.statusText} for ${url}`;
    try {
      const text = await response.text();
      if (text) {
        errorMessage += `: ${text}`;
      }
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorMessage);
  }
  // Don't try to parse success response body
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem('hoffmation-api-url', url);
}

export function getApiBaseUrl(): string {
  return localStorage.getItem('hoffmation-api-url') || window.location.origin;
}
