function getBaseUrl(): string {
  return localStorage.getItem('hoffmation-api-url') || '/api';
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

export function setApiBaseUrl(url: string) {
  localStorage.setItem('hoffmation-api-url', url);
}

export function getApiBaseUrl(): string {
  return localStorage.getItem('hoffmation-api-url') || '/api';
}
