// Test helper: a fake WordPress, so no test can reach a real site.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

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

const postsUrl = (baseUrl: string) => `${baseUrl}/wp-json/wp/v2/posts`;

export type WordPressCalls = { creates: number; updates: number[] };

// Accepts posts like a real WordPress: create returns a new id, update returns the same id.
// The returned object counts the calls, so tests can check what was sent where.
export function wordpressPublishes(baseUrl: string, remoteId = 101): WordPressCalls {
  const calls: WordPressCalls = { creates: 0, updates: [] };
  wordpress.use(
    http.post(postsUrl(baseUrl), () => {
      calls.creates += 1;
      return HttpResponse.json({ id: remoteId, link: `${baseUrl}/?p=${remoteId}` }, { status: 201 });
    }),
    http.post(`${postsUrl(baseUrl)}/:id`, ({ params }) => {
      const id = Number(params.id);
      calls.updates.push(id);
      return HttpResponse.json({ id, link: `${baseUrl}/?p=${id}` });
    }),
  );
  return calls;
}

export function wordpressPublishFails(baseUrl: string, status: number, headers: Record<string, string> = {}): WordPressCalls {
  const calls: WordPressCalls = { creates: 0, updates: [] };
  const fail = () => HttpResponse.json({ code: 'error', message: 'Nope' }, { status, headers });
  wordpress.use(
    http.post(postsUrl(baseUrl), () => {
      calls.creates += 1;
      return fail();
    }),
    http.post(`${postsUrl(baseUrl)}/:id`, ({ params }) => {
      calls.updates.push(Number(params.id));
      return fail();
    }),
  );
  return calls;
}
