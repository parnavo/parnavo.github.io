# R. N. Electronics — website

A complete, self-contained website for R. N. Electronics, Telecommunications Equipment Supplier, Kolkata.
No framework, no build-time dependencies, no tracking. The 3D scenes run on a small built-in WebGL renderer.

## What is in this folder

| Path | What it is |
| --- | --- |
| `index.html`, `about/`, `products/`, `solutions/`, `industries/`, `applications/`, `support/`, `quote/`, `contact/`, `privacy/`, `terms/`, `disclaimer/` | One HTML file per page, each with its own title, description, canonical link, Open Graph tags and JSON-LD |
| `products/<id>/` | One page per product |
| `admin/` | Content admin (not indexed by search engines) |
| `assets/content.json` | **All business content**: company facts, contact, products, solutions, industries, FAQs, SEO, legal text |
| `assets/app.js`, `assets/scenes.js`, `assets/glkit.js`, `assets/style.css` | Site code, 3D scenes, renderer, design system |
| `sitemap.xml`, `robots.txt`, `404.html` | Search-engine files |

## Before launch

Every fact on the site carries a **verified** flag and a **source**. The shipped content was gathered from the public
Google Business listing, a TP-Link dealer list and public customer reviews. None of it is owner-confirmed yet.

1. Open `/admin/`, go through each section, correct anything wrong and tick **Confirmed by R. N. Electronics**.
2. Add what only the business knows: year established, WhatsApp number, warranty process, product photos, real projects.
3. Have the Privacy Policy, Terms and Disclaimer reviewed.
4. Under **Settings**, set the **Site URL** and switch the mode to **Live**. Live mode hides every unconfirmed item.
5. Click **Export content.json** and replace `assets/content.json` on the server.

The admin's **Launch checklist** tracks these steps.

## Hosting

Upload the folder to any static host (cPanel/Apache, Nginx, Netlify, Vercel, Cloudflare Pages, GitHub Pages).
It expects to live at the domain root. For a sub-folder, rebuild with `SITE_BASE=/folder/ node build.mjs`.

Protect or remove `/admin/` on the live server: on a static host it cannot change anything on the server, but it
does not need to be public.

## Enquiry forms

Static hosting has no database. Set **Settings → Form endpoint** to a URL that accepts a JSON `POST`
(for example a Formspree form or your own API). Each submission is sent with: `ref, at, name, company, mobile, email,
product, requirement, quantity, location, message, source, page`.

Without an endpoint, visitors who submit see their enquiry prepared as text, with buttons to copy it, email it, or
send it on WhatsApp (when a WhatsApp number is set). Nothing is silently lost.

Spam protection: hidden honeypot field, a minimum fill time, a limit on links in the message, and a per-browser rate limit.

## Updating content

- **Quick edit:** change `assets/content.json` (or export it from `/admin/`) and upload it. Pages pick it up on load.
- **Full rebuild** (refreshes page titles, sitemap and per-product pages): from the source project run `node build.mjs`
  (Node 18+) and upload `dist/site/`.

## Performance and accessibility notes

- 3D runs only while visible, pauses in background tabs, drops quality automatically on slow devices and phones,
  and falls back to illustrations when WebGL is unavailable.
- `prefers-reduced-motion` turns off smooth scrolling, scroll-driven 3D and decorative animation.
- Product illustrations are vector drawings; uploaded photos are resized and converted to WebP in the admin.
