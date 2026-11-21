# BUSHEMI v3

Interactive prototype of **BUSHEMI**, a home-healthcare platform for Zambia that combines **BUSHEMI-managed care** with an **independent professional marketplace** in one ecosystem.

- **Patient and Family app**: `patient/`
- **Healthcare Professional app**: `pro/`
- **Landing page** with both apps side by side: `index.html`
- **Architecture document**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Previous version (v2), archived: `legacy/v2/`

It is a static site: plain HTML, CSS and JavaScript. No build step, no dependencies, no server, no tracking.

## Host it on GitHub Pages

1. Put the contents of this folder in the root of your repo (for example `Chiloz/bushemi-2`, or a new repo). Keep `.nojekyll`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.

All links are relative and routing uses the URL hash (`#/path`), so it works under a repo sub-path with no configuration.

> If your current repo has the v2 `index.html` at the root, this replaces it. v2 is kept at `legacy/v2/index.html`.

To run locally: `python3 -m http.server 8000` in this folder, then open `http://localhost:8000`.

## Try it

Open the landing page and use both phones. They share one simulated database in the browser (`localStorage`), so actions in one app appear in the other, even across tabs. Each phone has a **Demo tools** button (top bar) to simulate network conditions, make the care team assign a visit, simulate a new request, approve your own verification, or reset everything.

Suggested script is on the landing page. In short:

1. Patient: book Grace Mulenga (independent) → pay (simulated).
2. Professional: sign in as Grace → accept → set off → start → end → write report.
3. Patient: read report, review. Professional: check earnings, request payout.
4. Patient: book **BUSHEMI Care** → the simulated care team assigns Natasha Banda.
5. Professional: **Join BUSHEMI** → in review → Demo tools → Approve → appears in patient search.

## Where to change things

| What | File |
| --- | --- |
| Prices, fees, voucher, cancellation rules, care line number, minimum payout | `assets/js/data/config.js` |
| Service catalogue, profession types, regulators, Lusaka areas | `assets/js/data/config.js` |
| Demo people, bookings, messages | `assets/js/data/seed.js` |
| Availability, pricing, matching, verification rules | `assets/js/domain/rules.js` |
| Booking state machine, messaging, notifications | `assets/js/domain/booking.js` |
| Shared UI pieces (badges, cards, forms) | `assets/js/shared/components.js` |
| Patient screens | `assets/js/patient/` and `assets/css/patient.css` |
| Professional screens | `assets/js/pro/` and `assets/css/pro.css` |

Set `careLine` in `config.js` to your real support number; until then the "Call care team" buttons say the line is not set up.

## What is real and what is simulated

Real in the prototype: the booking state machine, availability and conflict checks, pricing maths, matching, privacy gating, verification gating, validation, offline queueing of messages, saved drafts, accessibility basics, responsive layout.

Simulated, and labelled as such on screen: sign-in codes (shown on screen), mobile money payments and payouts, document upload and verification, the care team's assignment and clinical review, replies from the other side when its app is closed, route and live tracking, SMS and WhatsApp delivery, older reviews.

All prices, fees, licence numbers and people are fictional placeholders. Before a real launch you need legal review (Zambia Data Protection Act, health regulators NMCZ and HPCZ, payment and consumer rules), clinical governance, and a real backend. See the roadmap in the architecture document.

## Browser support

Current Chrome, Edge, Firefox and Safari, including Android Chrome on low-end phones. System fonts only, so it works offline after the first load.
