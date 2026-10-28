# Brief

## Problem
Agencies that run content for several client WordPress sites publish the same article many times: log in to each site, paste the post, publish, check it worked. It is slow, easy to get wrong, and there is no single place that shows which sites have the post and which don't.

## Goal
Write a post once, send it to many sites in one go, and see a clear result for every site.

## Users
An agency owner, freelancer or content manager who looks after 3–30 WordPress sites and has an admin or editor login on each.

## V1 scope (ships 30 Oct 2026)
1. Sign in.
2. Connect sites (credentials verified before saving).
3. List, re-verify and remove sites.
4. Write and edit posts.
5. Publish one post to several sites in one request.
6. Per-site results, and retry of failed sites only.

## Not in V1
Bulk send (many posts at once), collections, a background job queue, scheduling, media upload, and category/tag mapping. These are designed in Figma for V2.

## Constraints
- Client passwords are WordPress Application Passwords. They are stored encrypted and never shown or logged.
- Security plugins lock out repeated failed logins, so a rejected login is never retried automatically.
- Solo portfolio project: plain, explainable code over frameworks and infrastructure.
