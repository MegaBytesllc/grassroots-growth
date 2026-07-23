# Grassroots & Growth, LLC

Static marketing site for Grassroots & Growth, LLC, deployed on Cloudflare Pages.

| Path | Page |
| --- | --- |
| `/` | Home |
| `/about` | About Us |
| `/contact` | Contact + inquiry form |

Styling is Tailwind via CDN with a shared design-token config inlined in each page.

## Contact form

`POST /api/contact` is handled by [`functions/api/contact.js`](functions/api/contact.js), a
Cloudflare Pages Function that relays submissions to the inquiries inbox through
[Resend](https://resend.com). The API key lives in an encrypted environment variable, so it
is never exposed to the browser.

### Required configuration

In the Cloudflare Pages dashboard under **Settings → Environment variables**, add for
**Production** (and Preview, if you want the form live there):

| Variable | Value | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | your Resend key | **Encrypt this one.** |
| `CONTACT_TO` | `GGConsultingNY@outlook.com` | Optional; this is the default. |
| `CONTACT_FROM` | `Website <hello@yourdomain.com>` | Must be a Resend-verified domain. |

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
npx wrangler@4 pages dev . --port 8788 --compatibility-date 2026-05-22
```

Plain static servers will not work for the form or for clean URLs (`/about`, `/contact`) —
both are Pages features that only `wrangler pages dev` reproduces locally.

## Deploying

Pushing to `main` triggers a Cloudflare Pages build. Build command is empty and the output
directory is the repository root.
