type ErrorBody = { error: { code: string; message: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiOptions = {
  // The auth gate turns this off: for /me a 401 just means "show the sign-in page".
  redirectOn401?: boolean;
};

export async function api<T>(
  path: string,
  init?: RequestInit,
  { redirectOn401 = true }: ApiOptions = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (res.status === 401) {
    // Mid-session 401 = the session expired: send them to sign in again.
    if (redirectOn401) window.location.href = '/login';
    throw new ApiError(401, 'unauthorized', 'Not signed in');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error.code ?? 'unknown',
      body?.error.message ?? res.statusText,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
