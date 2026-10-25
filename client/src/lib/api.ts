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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (res.status === 401) {
    window.location.href = '/login';
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
