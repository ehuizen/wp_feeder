// /api/sites endpoints: check input, call the service, turn errors into HTTP codes.
import { Router, type Response } from 'express';
import { z } from 'zod';
import * as sites from '../services/sites.js';
import type { SiteError } from '../services/sites.js';
import { isUuid, sendNotFound, sendValidationError } from './http-errors.js';

export const sitesRouter = Router();

// HTTPS only: Basic auth over http would send the password readable on the network.
// Normalised to origin + path without a trailing slash, so "https://Blog.example/" and
// "https://blog.example" count as the same site.
const baseUrl = z.url({ protocol: /^https$/ }).transform((value) => {
  const url = new URL(value);
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
});

const fields = {
  name: z.string().trim().min(1).max(100),
  wpUsername: z.string().trim().min(1),
  appPassword: z.string().trim().min(1),
};

const createSiteSchema = z.object({ ...fields, baseUrl });

// strictObject: sending baseUrl (or anything unknown) is a 400. To change a URL, delete and re-add.
const updateSiteSchema = z
  .strictObject(fields)
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

function sendSiteError(res: Response, error: SiteError): void {
  switch (error.code) {
    case 'not_found':
      sendNotFound(res, 'Site');
      return;
    case 'site_exists':
      res.status(409).json({
        error: { code: 'site_exists', message: 'You have already connected this site' },
      });
      return;
    case 'wordpress_rejected':
      res.status(422).json({
        error: {
          code: 'wordpress_rejected',
          message: 'WordPress rejected the username or Application Password',
        },
      });
      return;
    case 'wordpress_unavailable': {
      const wait =
        error.retryAfterSeconds === null ? '' : ` Try again in ${error.retryAfterSeconds} s.`;
      res.status(502).json({
        error: {
          code: 'wordpress_unavailable',
          message: `Could not reach the WordPress site.${wait}`,
        },
      });
      return;
    }
  }
}

// Runs before every /sites/:id handler.
sitesRouter.param('id', (_req, res, next, id: string) => {
  if (!isUuid(id)) {
    sendSiteError(res, { code: 'not_found' });
    return;
  }
  next();
});

sitesRouter.get('/sites', async (_req, res) => {
  res.json(await sites.listSites(res.locals.user.id));
});

sitesRouter.post('/sites', async (req, res) => {
  const body = createSiteSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  const result = await sites.createSite(res.locals.user.id, body.data);
  if (!result.ok) return sendSiteError(res, result.error);
  res.status(201).json(result.site);
});

sitesRouter.patch('/sites/:id', async (req, res) => {
  const body = updateSiteSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  const result = await sites.updateSite(res.locals.user.id, req.params.id, body.data);
  if (!result.ok) return sendSiteError(res, result.error);
  res.json(result.site);
});

sitesRouter.post('/sites/:id/verify', async (req, res) => {
  const result = await sites.verifySite(res.locals.user.id, req.params.id);
  if (!result.ok) return sendSiteError(res, result.error);
  res.json(result.site);
});

sitesRouter.delete('/sites/:id', async (req, res) => {
  const deleted = await sites.deleteSite(res.locals.user.id, req.params.id);
  if (!deleted) return sendSiteError(res, { code: 'not_found' });
  res.status(204).end();
});
