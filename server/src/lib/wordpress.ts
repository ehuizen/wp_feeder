// The only file that talks to WordPress's REST API.
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

function headers(username: string, appPassword: string): Record<string, string> {
  return { Authorization: basicAuth(username, appPassword), 'User-Agent': USER_AGENT, Accept: 'application/json' };
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
      headers: headers(username, appPassword),
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

export type PostPayload = { title: string; content: string; excerpt: string };

export type SendResult =
  | { ok: true; remoteId: number; url: string }
  | { ok: false; reason: 'rejected' } // 401/403: wrong login, never retry
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number | null }
  | { ok: false; reason: 'unreachable' }
  | { ok: false; reason: 'failed'; message: string }; // WordPress answered with an error, e.g. 500

// WordPress errors look like { code, message }. Kept short so a huge HTML error page can't end up in the DB.
async function errorMessage(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  const detail =
    typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : res.status >= 500
        ? 'WordPress server error'
        : res.statusText || 'WordPress error';
  return `${res.status} · ${detail}`.slice(0, 300);
}

// 404 gets its own reason: on an update it means the post was deleted in WordPress.
type PostToResult = SendResult | { ok: false; reason: 'not_found'; message: string };

async function postTo(url: string, credentials: Credentials, post: PostPayload): Promise<PostToResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { ...headers(credentials.username, credentials.appPassword), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...post, status: 'publish' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: 'unreachable' };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, reason: 'rejected' };
  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: parseRetryAfter(res.headers.get('retry-after')) };
  }
  if (!res.ok) {
    return { ok: false, reason: res.status === 404 ? 'not_found' : 'failed', message: await errorMessage(res) };
  }

  const body: unknown = await res.json().catch(() => null);
  if (typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'number') {
    const link = 'link' in body && typeof body.link === 'string' ? body.link : `${credentials.baseUrl}/?p=${body.id}`;
    return { ok: true, remoteId: body.id, url: link };
  }
  return { ok: false, reason: 'unreachable' }; // a 200 that isn't WordPress JSON
}

// Creates the post, or updates it when we already sent it before, so a re-send never duplicates.
// If the remote post was deleted in WordPress (404), it is created again.
export async function sendPost(credentials: Credentials, post: PostPayload, remotePostId: number | null): Promise<SendResult> {
  const postsUrl = `${credentials.baseUrl}/wp-json/wp/v2/posts`;
  if (remotePostId !== null) {
    const updated = await postTo(`${postsUrl}/${remotePostId}`, credentials, post);
    if (updated.ok || updated.reason !== 'not_found') return updated;
  }
  const created = await postTo(postsUrl, credentials, post);
  return created.ok || created.reason !== 'not_found' ? created : { ok: false, reason: 'failed', message: created.message };
}
