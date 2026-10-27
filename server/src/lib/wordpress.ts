const TIMEOUT_MS = 15_000;
const USER_AGENT = 'WPFeeder/1.0';

export type Credentials = { baseUrl: string; username: string; appPassword: string };

// Expected outcomes are values, not exceptions. The service maps each one to an HTTP status.
export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'rejected' } // 401/403: wrong login, never retry
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number | null }
  | { ok: false; reason: 'unreachable' }; // timeout, DNS, TLS, 5xx, or not a WordPress response

// Never log this header: it is the password in reversible base64.
function basicAuth(username: string, appPassword: string): string {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
}

// Retry-After is either seconds ("120") or an HTTP date.
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

export async function verifyCredentials({ baseUrl, username, appPassword }: Credentials): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: basicAuth(username, appPassword), 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS), // AbortController + timer in one call
    });
  } catch {
    return { ok: false, reason: 'unreachable' };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, reason: 'rejected' };
  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: parseRetryAfter(res.headers.get('retry-after')) };
  }
  if (!res.ok) return { ok: false, reason: 'unreachable' };

  // A 200 HTML page (wrong URL, maintenance page) is not a WordPress user.
  const body: unknown = await res.json().catch(() => null);
  const isWpUser = typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'number';
  return isWpUser ? { ok: true } : { ok: false, reason: 'unreachable' };
}
