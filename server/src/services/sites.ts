import { decrypt, encrypt } from '../lib/crypto.js';
import { verifyCredentials, type VerifyResult } from '../lib/wordpress.js';
import * as sitesRepo from '../repositories/sites.js';
import type { Site } from '../repositories/sites.js';

// Everything that can go wrong on purpose. The route maps each code to an HTTP status.
export type SiteError =
  | { code: 'not_found' }
  | { code: 'site_exists' }
  | { code: 'wordpress_rejected' }
  | { code: 'wordpress_unavailable'; retryAfterSeconds: number | null };

export type SiteResult = { ok: true; site: Site } | { ok: false; error: SiteError };

type VerifyFailure = Extract<VerifyResult, { ok: false }>;

function fromWordPress(result: VerifyFailure): SiteError {
  if (result.reason === 'rejected') return { code: 'wordpress_rejected' };
  return {
    code: 'wordpress_unavailable',
    retryAfterSeconds: result.reason === 'rate_limited' ? result.retryAfterSeconds : null,
  };
}

export function listSites(userId: string): Promise<Site[]> {
  return sitesRepo.listSites(userId);
}

// Nothing is saved unless WordPress accepts the credentials first.
export async function createSite(
  userId: string,
  input: { name: string; baseUrl: string; wpUsername: string; appPassword: string },
): Promise<SiteResult> {
  const verified = await verifyCredentials({
    baseUrl: input.baseUrl,
    username: input.wpUsername,
    appPassword: input.appPassword,
  });
  if (!verified.ok) return { ok: false, error: fromWordPress(verified) };

  const site = await sitesRepo.insertSite(userId, {
    ...input,
    appPassword: encrypt(input.appPassword),
  });
  return site ? { ok: true, site } : { ok: false, error: { code: 'site_exists' } };
}

// A name-only change saves straight away. A login change is verified first, so a typo can't break a working site.
export async function updateSite(
  userId: string,
  siteId: string,
  changes: { name?: string; wpUsername?: string; appPassword?: string },
): Promise<SiteResult> {
  const loginChanged = changes.wpUsername !== undefined || changes.appPassword !== undefined;

  if (loginChanged) {
    const current = await sitesRepo.getSiteCredentials(userId, siteId);
    if (!current) return { ok: false, error: { code: 'not_found' } };

    const verified = await verifyCredentials({
      baseUrl: current.baseUrl,
      username: changes.wpUsername ?? current.wpUsername,
      appPassword: changes.appPassword ?? decrypt(current.appPassword),
    });
    if (!verified.ok) return { ok: false, error: fromWordPress(verified) };
  }

  const updated = await sitesRepo.updateSite(userId, siteId, {
    name: changes.name,
    wpUsername: changes.wpUsername,
    appPassword: changes.appPassword === undefined ? undefined : encrypt(changes.appPassword),
  });
  if (!updated) return { ok: false, error: { code: 'not_found' } };

  const site = loginChanged ? await sitesRepo.recordVerification(userId, siteId, 'ok') : updated;
  return site ? { ok: true, site } : { ok: false, error: { code: 'not_found' } };
}

// "Re-check this site". A wrong login is a result (the site becomes failing), not an error.
export async function verifySite(userId: string, siteId: string): Promise<SiteResult> {
  const credentials = await sitesRepo.getSiteCredentials(userId, siteId);
  if (!credentials) return { ok: false, error: { code: 'not_found' } };

  const verified = await verifyCredentials({
    baseUrl: credentials.baseUrl,
    username: credentials.wpUsername,
    appPassword: decrypt(credentials.appPassword), // plaintext lives only for this call
  });

  // Site down or rate limited: report it, but leave status alone. We learned nothing about the login.
  if (!verified.ok && verified.reason !== 'rejected') {
    return { ok: false, error: fromWordPress(verified) };
  }

  const site = await sitesRepo.recordVerification(userId, siteId, verified.ok ? 'ok' : 'failing');
  return site ? { ok: true, site } : { ok: false, error: { code: 'not_found' } };
}

export function deleteSite(userId: string, siteId: string): Promise<boolean> {
  return sitesRepo.deleteSite(userId, siteId);
}
