// Publishing: send one post to several sites at once, record a result per site, and retry only failures.
import { decrypt } from '../lib/crypto.js';
import { sendPost, type SendResult } from '../lib/wordpress.js';
import { findPost, type Post } from '../repositories/posts.js';
import * as publicationsRepo from '../repositories/publications.js';
import { getSitesWithCredentials, recordVerification, type SiteWithCredentials } from '../repositories/sites.js';

export type PublishResult = {
  siteId: string;
  status: 'success' | 'failed';
  url?: string;
  error?: string;
};

export type PublishOutcome = { ok: true; results: PublishResult[] } | { ok: false; error: 'not_found' };

type SendFailure = Extract<SendResult, { ok: false }>;

function failureMessage(result: SendFailure): string {
  switch (result.reason) {
    case 'rejected':
      return '401 · WordPress rejected the Application Password. Reconnect the site.';
    case 'rate_limited':
      return result.retryAfterSeconds === null
        ? '429 · The site is rate limiting requests. Try again later.'
        : `429 · The site is rate limiting requests. Try again in ${result.retryAfterSeconds} s.`;
    case 'unreachable':
      return 'Couldn’t reach the site (offline, timed out or not WordPress).';
    case 'failed':
      return result.message;
  }
}

async function publishToSite(
  userId: string,
  post: Post,
  site: SiteWithCredentials,
  remotePostId: number | null,
): Promise<PublishResult> {
  const result = await sendPost(
    // Plaintext password lives only for this call.
    { baseUrl: site.baseUrl, username: site.wpUsername, appPassword: decrypt(site.appPassword) },
    { title: post.title, content: post.content, excerpt: post.excerpt },
    remotePostId,
  );
  const attemptedAt = new Date();

  if (result.ok) {
    await publicationsRepo.upsertPublication(userId, post.id, site.id, {
      status: 'success',
      remotePostId: result.remoteId,
      url: result.url,
      attemptedAt,
    });
    return { siteId: site.id, status: 'success', url: result.url };
  }

  // Security plugins lock out repeated bad logins, so a rejected site is marked failing and not retried.
  if (result.reason === 'rejected') await recordVerification(userId, site.id, 'failing');

  const error = failureMessage(result);
  await publicationsRepo.upsertPublication(userId, post.id, site.id, { status: 'failed', error, attemptedAt });
  return { siteId: site.id, status: 'failed', error };
}

export async function publishPost(userId: string, postId: string, siteIds: string[]): Promise<PublishOutcome> {
  const post = await findPost(userId, postId);
  if (!post) return { ok: false, error: 'not_found' };

  const uniqueIds = [...new Set(siteIds)];
  const sites = await getSitesWithCredentials(userId, uniqueIds);
  // Any id that isn't this user's site makes the whole request a 404, so ids can't be probed.
  if (sites.length !== uniqueIds.length) return { ok: false, error: 'not_found' };

  const remoteIds = await publicationsRepo.remotePostIds(userId, postId);
  for (const site of sites) {
    await publicationsRepo.upsertPublication(userId, postId, site.id, { status: 'pending' });
  }

  // allSettled, not all: one site failing (or throwing) never stops the others.
  const settled = await Promise.allSettled(
    sites.map((site) => publishToSite(userId, post, site, remoteIds.get(site.id) ?? null)),
  );

  const results = await Promise.all(
    settled.map(async (outcome, i): Promise<PublishResult> => {
      if (outcome.status === 'fulfilled') return outcome.value;
      const site = sites[i]!;
      console.error(`Publishing post ${postId} to site ${site.id} failed unexpectedly`);
      const error = 'Something went wrong while sending. Try again.';
      await publicationsRepo
        .upsertPublication(userId, postId, site.id, { status: 'failed', error, attemptedAt: new Date() })
        .catch(() => undefined);
      return { siteId: site.id, status: 'failed', error };
    }),
  );
  return { ok: true, results };
}

export async function retryFailed(userId: string, postId: string): Promise<PublishOutcome> {
  const post = await findPost(userId, postId);
  if (!post) return { ok: false, error: 'not_found' };

  const failed = await publicationsRepo.failedSiteIds(userId, postId);
  if (failed.length === 0) return { ok: true, results: [] };
  return publishPost(userId, postId, failed);
}
