# User stories (V1)

1. **Sign in.** As a user, I sign in so that my sites and posts are private to me.
   - Signed-out visitors see a landing page with "Continue to sign in".
   - Any API call without a session returns 401; another user's data returns 404.

2. **Connect a site.** As a user, I add a WordPress site with a name, URL, username and Application Password, so that WPFeeder can publish to it.
   - The URL must be https and is normalised (no trailing slash).
   - WordPress must accept the credentials before anything is saved; otherwise I see why (wrong password, site unreachable, rate limited).
   - The same URL can't be added twice.

3. **Manage sites.** As a user, I see all my sites with their status in words, re-verify them, reconnect a failing one, and remove one I no longer manage.

4. **Write posts.** As a user, I write and edit posts (title, excerpt, content) in WPFeeder. Nothing reaches WordPress until I distribute it.

5. **Publish to many sites.** As a user, I choose one post and several connected sites and publish in one action.
   - One site failing never stops the others.
   - Sending a post to a site that already has it updates that WordPress post instead of duplicating it.

6. **See results and retry.** As a user, I see each site's result (Published with a link, or Failed with the reason), and retry only the failed sites.
   - A site whose login WordPress rejects is marked "Auth failed" and is not retried automatically.
