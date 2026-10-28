// Turns an Auth0 login into our own users row.
import { z } from 'zod';
import { upsertUser, type User } from '../repositories/users.js';

// The ID token claims we use. Auth0 always sends sub; email and name depend on the login method.
const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().optional(),
  name: z.string().optional(),
});

export function getOrCreateUser(claims: unknown): Promise<User> {
  const { sub, email, name } = claimsSchema.parse(claims);
  return upsertUser(sub, email ?? null, name ?? null);
}
