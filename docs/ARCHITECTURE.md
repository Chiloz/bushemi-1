# BUSHEMI v3 · Product architecture

## 1. Purpose and principles

BUSHEMI connects families with home healthcare. v3 shows how **two supply models live in one product**:

- **BUSHEMI Care Team (managed)**: BUSHEMI chooses, schedules and stands behind the professional, at a fixed all-inclusive price.
- **Independent marketplace**: the patient chooses a verified professional who sets their own rate and accepts requests.

Principles that shaped every decision:

1. **One ecosystem, visibly two models.** Same identity, same verification bar, same booking record. The difference is shown by one badge, one sentence and honest facts, rendered by shared components so it never drifts.
2. **Two audiences, two apps.** Patients and families browse and decide. Professionals work: next action first, earnings visible, patient details revealed only as far as the booking state allows.
3. **Trust is a feature.** Verification gates visibility. Privacy is enforced by state. Money is shown plainly, with the fee on its own line.
4. **Built for the context.** Mobile money, SMS and WhatsApp, patchy data, landmarks instead of street numbers, voice fallback, low-end phones.
5. **Honest prototype.** What is simulated is labelled where it appears.

## 2. Domain map (13 domains)

| # | Domain | Patient app | Professional app | Key code |
| --- | --- | --- | --- | --- |
| 1 | Identity and access | Phone sign-in with OTP, household roles (owner, manager, viewer), invite family, "preview as" | Phone sign-in, demo accounts, join wizard | `patient/onboarding.js`, `pro/onboarding.js`, `engine.js` (Session) |
| 2 | Patient and family | Households, recipients (self, mother…), addresses with landmark | Sees limited view of recipient | `patient/care.js`, `seed.js` |
| 3 | Professional management | Public profile | Profile, services and rates, areas, settings | `pro/me.js` |
| 4 | Verification | Verified badge, explained on the trust page | Checks list, re-upload, renewals, expiry warnings | `rules.js` (`BV.verify`), `pro/me.js` |
| 5 | Service catalogue | 10 services, home, video and plan modes | Offer services within a rate guideline | `config.js` |
| 6 | Discovery and matching | Browse, filter, sort, compare up to 3, alternatives when a request fails | Care Team assignment scoring | `patient/discover.js`, `rules.js` (`BV.match`) |
| 7 | Availability | Real open slots (shifts, travel buffer, lead time, conflicts) or arrival windows | Days, shifts, blocked dates, online or paused | `rules.js` (`BV.avail`), `pro/work.js` |
| 8 | Booking and appointments | 3-step booking, reschedule, cancel with fee rules | Requests, accept or decline, schedule, change requests | `booking.js`, `patient/booking.js`, `pro/work.js` |
| 9 | Care delivery and visit documentation | Track, video or voice, read report | Set off, arrive, end, structured report with validation and escalation | `pro/work.js` |
| 10 | Messaging and notifications | Per-booking chat, reminders, SMS and WhatsApp preferences | Same chat, request alerts | `booking.js` (`BV.msg`, `BV.notif`), `shared/views.js` |
| 11 | Patient health information | Medicines, vitals, history, consent to share | Health summary shown only after accepting, and only if consented; suggested checks | `patient/care.js`, `pro/core.js` |
| 12 | Payments and earnings | Quote, voucher, simulated mobile money, hold and release, receipts | Earnings, ledger, payouts (independent) or accrued pay (Care Team) | `rules.js` (`BV.pricing`), `pro/me.js` |
| 13 | Reviews | Rate after completion, tags | Reviews, rating | `booking.js`, `pro/me.js` |

## 3. Data model

One state object (`bv3.state`, schema 3), shared by both apps:

```
households ─┬─ recipients (r*)            pros (independent | managed)
            ├─ addresses (landmark)        ├─ services [{id, rate}]
            └─ users (owner/manager/viewer)├─ availability {days, shifts, blocked, online}
                                           ├─ areas, languages, specialties
bookings ── service, model, pro, recipient ├─ verification {status, checks{...}}
   ├─ date, time | window, mode            └─ stats
   ├─ price {base, fee, discount, total, proPayout}
   ├─ status, payState, expiresAt
   ├─ timeline[], change?, report?
messages (per booking) · notifications (per role+id) · reviews · ledger · payouts
```

Per-device, not shared: `bv3.session.<app>` (who is signed in), `bv3.draft.<app>` (unsent form data, so nothing is lost on refresh), presence heartbeat, simulated network mode and outbox.

## 4. The booking state machine

```
Independent:  requested ──accept──▶ confirmed ──set off──▶ en_route ──arrive──▶ in_progress ──end──▶ report_due ──report──▶ completed
                 │ decline / 2h timeout            │ cancel (either side)
                 ▼                                 ▼
             declined / expired               cancelled   (payment hold released, alternatives offered)

Managed:      assigning ──care team assigns──▶ confirmed ──▶ … same as above …
                 └─ no match ▶ care team calls to agree another time
```

Rules enforced in code: a professional cannot accept a clash; requests expire after 2 hours; reschedule needs the other side's approval; cancel fees follow the policy (independent: free until 12 h, then 50 %; managed: free until 6 h, then 25 %); a report is required to complete; ledger entry is created on completion (independent: available, managed: accrued).

## 5. Managed vs independent, side by side

| Aspect | Managed | Independent |
| --- | --- | --- |
| Chosen by | BUSHEMI matching (area, history, language, rating, load) | Patient |
| Time | Window (morning, afternoon, evening) then exact time | Exact slot |
| Price | `managedPrice` all-inclusive | Professional's `rate` + service fee % |
| Professional earns | Fixed `staffPay` per visit, monthly payroll | The rate (commission configurable, 0 % in demo) |
| Failure handling | Care team reassigns | Hold released, alternatives shown |
| Report | Clinical-lead review (simulated) | Own record |
| Verification | 5 checks + interview + skills assessment | 5 checks |

## 6. Privacy and trust by design

- Unverified or paused professionals never appear to patients.
- Before accepting, a professional sees first name, age, area and the request note only. After accepting, the address and landmark. Health summary only if the household consented.
- Professional phone and registration numbers are never shown to patients.
- Patients can export or delete their data from the account area.

## 7. Zambia and Africa considerations built in

Mobile money (MTN, Airtel, Zamtel) as primary payment; SMS and WhatsApp channels in preferences; landmark field in every address; voice-call fallback for video; call-the-care-team button; offline banner with queued messages; no web fonts or libraries; large-text setting; Lusaka areas as configuration; emergency number 112 shown where it matters.

## 8. Design direction

Patient app: warm paper background, rounded cards, large touch targets, plain words, reassurance first. Professional app: cooler slate with a navy header, denser lists, green primary actions, the next job always on top. Shared: logo, type scale (rem, scales with "Larger text"), status colours (ok, warn, err, info) always paired with text or icons, empty, loading and error states on every list, 44 px minimum targets, visible focus, labelled controls, `aria-live` for toasts.

## 9. Code structure

```
index.html            landing page, both apps embedded
patient/ pro/         one HTML entry each
assets/css/           base.css (tokens, components), patient.css, pro.css
assets/js/core/       util, icons, engine (store, router, UI, actions)
assets/js/data/       config (rules and catalogue), seed (demo data)
assets/js/domain/     rules (pricing, availability, matching, verification), booking (state machine, messages)
assets/js/shared/     components, views used by both apps
assets/js/patient/    patient screens
assets/js/pro/        professional screens
legacy/v2/            previous version
```

No framework: a hash router, event delegation through `data-act`, and string templates with escaping. It is deliberately small so any developer can read it in an afternoon, and the **domain layer has no UI code**, so it can move to a server almost unchanged.

## 10. Roadmap to a real product

1. **Backend**: Postgres (or Firebase for speed). Tables mirror section 3. Move `domain/` rules to the server, keep the same state machine.
2. **Auth**: real SMS OTP (Africa's Talking or Twilio), device sessions.
3. **Payments**: MTN MoMo and Airtel Money collection APIs with escrow-style hold and release; payouts via disbursement APIs.
4. **Notifications**: SMS and WhatsApp Business templates for requests, reminders, status.
5. **Operations console**: verification queue, care-team assignment, clinical-lead report review, incident handling. The prototype simulates this role; a real one is required.
6. **Files**: document upload to private storage with staff-only access.
7. **Maps**: real distance and ETA, geocoded landmarks.
8. **Offline**: service worker for the shell, background sync for the outbox.
9. **Compliance**: Zambia Data Protection Act review, consent records, retention rules, clinical governance with NMCZ and HPCZ guidance.
10. **Languages**: Bemba and Nyanja UI.
11. **Measure**: acceptance rate, time to confirm, no-show rate, repeat bookings, report completion, NPS.
