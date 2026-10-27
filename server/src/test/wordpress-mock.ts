import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// A fake internet for tests. Any outside call without a handler is blocked,
// so no test can ever reach a real site.
export const wordpress = setupServer();

// Supertest calls our own app on 127.0.0.1; msw sees those too and must let them through.
function isLocalRequest(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || !('request' in data)) return false;
  return data.request instanceof Request && new URL(data.request.url).hostname === '127.0.0.1';
}

export function startWordPressMock(): void {
  wordpress.listen({
    onUnhandledFrame({ frame, defaults }) {
      if (isLocalRequest(frame.data)) return;
      defaults.error(); // prints which URL had no handler
      throw new Error('Blocked an unmocked request in a test');
    },
  });
}

const usersMe = (baseUrl: string) => `${baseUrl}/wp-json/wp/v2/users/me`;

export function wordpressAccepts(baseUrl: string): void {
  wordpress.use(http.get(usersMe(baseUrl), () => HttpResponse.json({ id: 1, name: 'editor' })));
}

export function wordpressRejects(baseUrl: string): void {
  wordpress.use(
    http.get(usersMe(baseUrl), () =>
      HttpResponse.json({ code: 'rest_not_logged_in' }, { status: 401 }),
    ),
  );
}

export function wordpressRateLimits(baseUrl: string, retryAfterSeconds: number): void {
  wordpress.use(
    http.get(
      usersMe(baseUrl),
      () =>
        new HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }),
    ),
  );
}

export function wordpressIsDown(baseUrl: string): void {
  // Like DNS failing or a refused connection.
  wordpress.use(http.get(usersMe(baseUrl), () => HttpResponse.error()));
}
