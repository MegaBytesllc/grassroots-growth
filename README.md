# Grassroots & Growth, LLC

Static marketing site for Grassroots & Growth, LLC, deployed on Cloudflare Pages.

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | About Us |
| `/contact` | Contact + inquiry form |

Styling is Tailwind via CDN with a shared design-token config inlined in each page.

## Contact form

`POST /api/contact` is handled by [`src/contact.js`](src/contact.js) and relays submissions
to the inquiries inbox through [Resend](https://resend.com). The API key lives in an
encrypted secret, so it is never exposed to the browser.

The site deploys as a Cloudflare **Worker with static assets**, not a Pages project. Only
`public/` is served publicly; `src/`, config, and this README are not reachable over HTTP.

### Required configuration

`RESEND_API_KEY` must be an **encrypted secret** on the Worker — `wrangler deploy` preserves
secrets but does not preserve plaintext dashboard variables. Set it once:

```bash
npx wrangler secret put RESEND_API_KEY
```

`CONTACT_TO` and `CONTACT_FROM` are not secrets and belong in the `vars` block of
`wrangler.jsonc`, so they survive every deploy. `CONTACT_FROM` must use a Resend-verified
domain.

Until `RESEND_API_KEY` is set the endpoint returns 503 and the form tells visitors to email
directly, so nothing is silently lost.

`CONTACT_FROM` defaults to `onboarding@resend.dev`, which Resend allows without domain
verification but which **only delivers to the Resend account owner's address**. Verify a
sending domain before relying on it in production.

### Behavior

- Requires name, email, and message; validates email shape and field lengths server-side.
- Hidden honeypot field (`company_website`) silently absorbs bots.
- Sets `reply_to` to the submitter, so replying from Outlook reaches them directly.
- Escapes submitted values before embedding them in the HTML email.

## Local development

Needs Node 22+ (Wrangler's minimum).

```bash
cp .dev.vars.example .dev.vars   # then paste your real Resend key
npx wrangler@4 dev --port 8788
```

Plain static servers will not work: the form needs the Worker, and the clean URLs
(`/about`, `/contact`) come from the assets binding's HTML handling.

## Deploying

Pushing to `main` triggers a Cloudflare Workers build, which runs `wrangler deploy` and
reads `wrangler.jsonc`.
