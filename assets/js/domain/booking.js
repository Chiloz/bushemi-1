/* BUSHEMI v3 · domain/booking.js
   ONE booking record and ONE state machine for both delivery models.

   independent:  requested -> confirmed -> en_route -> in_progress -> report_due -> completed
                 (the chosen professional must accept; they can decline or let it expire)
   managed:      assigning -> confirmed -> en_route -> in_progress -> report_due -> completed
                 (the BUSHEMI care team assigns someone; the clinical lead reviews the report)
   either:       cancelled at any point before the visit starts

   Every change goes through BV.booking.* so both apps stay consistent, and every change
   writes a timeline entry and the right notifications.                                       */
(function (BV) {
  'use strict';
  const U = BV.u, S = () => BV.Store;

  /* ---------- presentation of status ---------- */
  const META = {
    requested: { patient: ['Waiting for confirmation', 'warn'], pro: ['New request', 'warn'] },
    assigning: { patient: ['Assigning a professional', 'info'], pro: ['Being assigned', 'info'] },
    confirmed: { patient: ['Confirmed', 'ok'], pro: ['Confirmed', 'ok'] },
    en_route: { patient: ['On the way', 'info'], pro: ['On the way', 'info'] },
    in_progress: { patient: ['Visit in progress', 'info'], pro: ['In progress', 'info'] },
    report_due: { patient: ['Visit finished', 'info'], pro: ['Report due', 'warn'] },
    completed: { patient: ['Completed', 'neutral'], pro: ['Completed', 'neutral'] },
    declined: { patient: ['Not accepted', 'err'], pro: ['Declined', 'neutral'] },
    expired: { patient: ['No response', 'err'], pro: ['Expired', 'neutral'] },
    cancelled: { patient: ['Cancelled', 'neutral'], pro: ['Cancelled', 'neutral'] }
  };
  const OPEN = ['requested', 'assigning', 'confirmed', 'en_route', 'in_progress', 'report_due'];
  const CLOSED = ['completed', 'declined', 'expired', 'cancelled'];

  const log = (b, label, by) => { b.timeline.push({ ts: Date.now(), label, by: by || 'system' }); };
  const find = (s, id) => s.bookings.find(b => b.id === id);
  const pro = (s, id) => s.pros.find(p => p.id === id);
  const svcName = b => BV.svc(b.service).name;
  const recName = (s, b) => s.recipients.find(r => r.id === b.recipient).name;

  function notify(s, to, text, link) {
    s.notifications.unshift({ id: U.uid('n'), to, text, ts: Date.now(), read: false, link: link || null });
    if (s.notifications.length > 80) s.notifications.length = 80;
  }
  const toPatient = (s, b) => ({ role: 'patient', id: b.household });
  const toPro = id => ({ role: 'pro', id });

  const B = {
    META, OPEN, CLOSED,
    info(b, role) { const m = META[b.status] || META.requested; return { label: m[role || 'patient'][0], tone: m[role || 'patient'][1] }; },
    isOpen: b => OPEN.includes(b.status),
    isUpcoming: b => OPEN.includes(b.status),
    isVideo: b => b.mode === 'video',

    /* The visual journey a patient sees, with the managed/independent wording difference */
    journey(b) {
      const second = b.model === 'managed' ? 'Assigned' : 'Accepted';
      const rank = { requested: 0, assigning: 0, confirmed: 1, en_route: 2, in_progress: 3, report_due: 4, completed: 5 }[b.status];
      const video = B.isVideo(b);
      const steps = [['Requested', 0], [second, 1], [video ? 'Call ready' : 'On the way', 2], ['Visit', 3], ['Report', 4], ['Reviewed', 5]];
      const reviewed = !!b.review;
      return steps.map(([label, i]) => {
        let st = 'todo';
        if (rank === undefined) return { label, state: 'todo' };
        if (i === 5) st = reviewed ? 'done' : (b.status === 'completed' ? 'now' : 'todo');
        else if (i < rank || (b.status === 'completed' && i <= 4)) st = 'done';
        else if (i === rank) st = 'now';
        return { label, state: st };
      });
    },

    ref() { return 'BSH-' + Math.random().toString(36).slice(2, 6).toUpperCase(); },

    /* What a professional may see. Details of the person being cared for stay limited until the booking is accepted. */
    proView(b, s) {
      s = s || S().get();
      const r = s.recipients.find(x => x.id === b.recipient);
      const full = !(b.status === 'requested' || b.status === 'assigning');
      return {
        full, first: U.firstName(r.name), name: r.name, age: r.age, relation: r.relation,
        area: b.address.area, address: b.address, conditions: r.conditions, allergies: r.allergies,
        meds: r.meds, notes: b.notes, emergency: r.emergency
      };
    },

    /* ---------- patient actions ---------- */
    create(d) {
      let id;
      S().update(s => {
        const svc = BV.svc(d.service), p = d.pro ? pro(s, d.pro) : null;
        const hh = s.households.find(h => h.id === d.household);
        const voucher = !!d.voucher && !hh.voucherUsed;
        const price = BV.pricing.quote({ service: svc, model: d.model, pro: p, voucher });
        if (voucher) hh.voucherUsed = true;
        const indep = d.model === 'independent';
        const b = {
          id: U.uid('b'), ref: B.ref(), household: d.household, recipient: d.recipient, createdAt: Date.now(),
          model: d.model, service: d.service, pro: indep ? d.pro : null,
          date: d.date, time: indep ? d.time : null, window: indep ? null : d.window, durationMin: svc.duration, mode: svc.mode,
          address: d.address, notes: d.notes || '', status: indep ? 'requested' : 'assigning', price,
          payment: { method: d.payment.method, number: d.payment.number, state: (indep || d.payment.method !== 'cash') ? 'held' : 'pay_after', simulated: true },
          expiresAt: indep ? Date.now() + BV.config.requestResponseHours * 3600000 : null,
          travel: null, startedAt: null, endedAt: null, report: null, review: null, change: null, cancel: null, match: null,
          consent: { shareHealth: !!d.shareHealth }, timeline: []
        };
        log(b, 'Request sent', 'patient');
        if (indep) {
          log(b, 'Waiting for ' + p.name + ' to accept', 'system');
          notify(s, toPro(p.id), 'New request: ' + svc.name + ' for ' + U.firstName(recName(s, b)) + ' in ' + b.address.area + ', ' + U.when(b.date, b.time), '/request/' + b.id);
        } else {
          log(b, 'BUSHEMI care team is reviewing and choosing the best professional', 'care_team');
        }
        s.bookings.push(b);
        id = b.id;
      });
      return id;
    },

    cancel(id, by, reason) {
      S().update(s => {
        const b = find(s, id);
        if (!B.isOpen(b) || b.status === 'in_progress') return;
        const terms = BV.pricing.cancellation(b);
        const fee = by === 'patient' ? terms.fee : 0;
        const p = b.pro ? pro(s, b.pro) : null;
        b.cancel = { by, reason: reason || '', ts: Date.now(), fee };
        b.status = 'cancelled';
        b.payment.state = fee ? 'fee_charged' : 'released';
        log(b, by === 'patient' ? 'Cancelled by the patient' + (reason ? ': ' + reason : '') : 'Cancelled by ' + (p ? p.name : 'BUSHEMI') + (reason ? ': ' + reason : ''), by);
        if (by === 'patient' && b.pro) notify(s, toPro(b.pro), 'Cancelled: ' + svcName(b) + ', ' + U.when(b.date, b.time), null);
        if (by !== 'patient') notify(s, toPatient(s, b), (p ? p.name : 'The professional') + ' had to cancel ' + svcName(b) + '. Your payment hold was released. Tap to find another time.', '/booking/' + b.id);
      });
    },

    /* Reschedule. Independent: the professional must approve. Managed: the care team re-confirms. */
    requestChange(id, c) {
      S().update(s => {
        const b = find(s, id);
        if (!B.isOpen(b) || ['en_route', 'in_progress', 'report_due'].includes(b.status)) return;
        if (b.model === 'independent') {
          b.change = { date: c.date, time: c.time, ts: Date.now() };
          log(b, 'Patient asked to move the visit to ' + U.when(c.date, c.time), 'patient');
          notify(s, toPro(b.pro), 'Reschedule request: ' + svcName(b) + ' to ' + U.when(c.date, c.time), '/request/' + b.id);
        } else {
          b.date = c.date; b.window = c.window; b.time = null; b.pro = null; b.status = 'assigning'; b.match = null;
          log(b, 'Patient asked to move the visit. The care team is re-confirming.', 'patient');
        }
      });
    },
    resolveChange(id, accept) {
      S().update(s => {
        const b = find(s, id);
        if (!b || !b.change) return;
        const c = b.change; b.change = null;
        if (accept) {
          b.date = c.date; b.time = c.time;
          log(b, 'New time confirmed: ' + U.when(c.date, c.time), 'pro');
          notify(s, toPatient(s, b), 'New time confirmed: ' + svcName(b) + ', ' + U.when(c.date, c.time), '/booking/' + b.id);
        } else {
          log(b, 'The professional could not do the new time. The original time stands.', 'pro');
          notify(s, toPatient(s, b), 'The new time was not possible. Your visit stays on ' + U.when(b.date, b.time) + '.', '/booking/' + b.id);
        }
      });
    },

    review(id, r) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.review || b.status !== 'completed') return;
        const hh = s.households.find(h => h.id === b.household);
        const owner = hh.members[0].name;
        s.reviews.push({ id: U.uid('rv'), booking: b.id, pro: b.pro, model: b.model, name: U.firstName(owner) + ' ' + owner.split(' ').pop()[0] + '.', rating: r.rating, tags: r.tags || [], text: r.text || '', ts: Date.now() });
        if (r.privateNote) s.feedback.push({ id: U.uid('fb'), booking: b.id, text: r.privateNote, ts: Date.now() });
        b.review = { rating: r.rating, ts: Date.now() };
        log(b, 'Review left (' + r.rating + ' stars)', 'patient');
        notify(s, toPro(b.pro), 'New ' + r.rating + '-star review for ' + svcName(b), null);
      });
    },

    payNow(id) { S().update(s => { const b = find(s, id); if (b && b.payment.state === 'due') { b.payment.state = 'paid'; log(b, 'Payment received (simulated)', 'patient'); } }); },

    /* ---------- professional actions ---------- */
    accept(id, proId) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'requested' || b.pro !== proId) return;
        b.status = 'confirmed'; b.expiresAt = null;
        log(b, pro(s, proId).name + ' accepted', 'pro');
        notify(s, toPatient(s, b), pro(s, proId).name + ' accepted your request for ' + U.when(b.date, b.time) + '.', '/booking/' + b.id);
      });
    },
    decline(id, proId, reason) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'requested' || b.pro !== proId) return;
        b.status = 'declined'; b.payment.state = 'released';
        log(b, pro(s, proId).name + ' could not take this request' + (reason ? ' (' + reason + ')' : ''), 'pro');
        notify(s, toPatient(s, b), pro(s, proId).name + ' could not take this request. Your payment hold was released. Tap to see similar professionals.', '/booking/' + b.id);
      });
    },
    /* A managed professional asks to be reassigned: goes back to the care team */
    release(id, proId, reason) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.model !== 'managed' || b.status !== 'confirmed' || b.pro !== proId) return;
        b.pro = null; b.time = null; b.status = 'assigning'; b.match = null;
        log(b, 'Reassignment requested by the professional' + (reason ? ': ' + reason : ''), 'pro');
        log(b, 'Care team is choosing another professional', 'care_team');
      });
    },
    startTravel(id, proId, eta) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'confirmed' || b.pro !== proId) return;
        b.status = 'en_route'; b.travel = { startedAt: Date.now(), etaMin: eta || 15 };
        log(b, pro(s, proId).name + ' is on the way', 'pro');
        notify(s, toPatient(s, b), U.firstName(pro(s, proId).name) + ' is on the way. About ' + (eta || 15) + ' minutes.', '/booking/' + b.id + '/track');
      });
    },
    startVisit(id, proId) {
      S().update(s => {
        const b = find(s, id);
        if (!b || !['confirmed', 'en_route'].includes(b.status) || b.pro !== proId) return;
        b.status = 'in_progress'; b.startedAt = Date.now();
        log(b, B.isVideo(b) ? 'Call started' : 'Arrived. Visit started', 'pro');
        notify(s, toPatient(s, b), B.isVideo(b) ? 'Your call has started.' : U.firstName(pro(s, proId).name) + ' has arrived.', '/booking/' + b.id);
      });
    },
    endVisit(id, proId) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'in_progress' || b.pro !== proId) return;
        b.status = 'report_due'; b.endedAt = Date.now();
        log(b, 'Visit finished. Report being written', 'pro');
      });
    },
    submitReport(id, proId, report) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'report_due' || b.pro !== proId) return;
        const p = pro(s, proId);
        b.report = Object.assign({}, report, { submittedAt: Date.now(), review: b.model === 'managed' ? 'pending' : 'n/a' });
        b.status = 'completed';
        b.payment.state = b.payment.state === 'pay_after' ? 'due' : 'paid';
        s.ledger.unshift({ id: U.uid('l'), pro: proId, booking: b.id, desc: svcName(b) + ' · ' + U.firstName(recName(s, b)), amount: b.price.proPayout, ts: Date.now(), status: b.model === 'managed' ? 'accrued' : 'available' });
        log(b, 'Visit report submitted', 'pro');
        if (b.model === 'managed') log(b, 'Report sent to the clinical lead for review', 'care_team');
        notify(s, toPatient(s, b), 'Visit summary from ' + U.firstName(p.name) + ' is ready. Tap to read it and leave a review.', '/booking/' + b.id);
        if (report.escalate) notify(s, toPatient(s, b), 'Follow-up advised: ' + (report.followUpNote || 'please see the summary.'), '/booking/' + b.id);
        s.recipients.filter(r => r.id === b.recipient).forEach(r => {
          const v = report.vitals || {};
          const ts = Date.now();
          if (v.bp) { const m = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(v.bp); if (m) r.vitals.bp.push({ ts, a: +m[1], b: +m[2], by: p.name }); }
          if (v.sugar) r.vitals.sugar.push({ ts, a: +v.sugar, by: p.name });
        });
      });
    },
    requestPayout(proId, method, number) {
      let amt = 0;
      S().update(s => {
        const mine = s.ledger.filter(l => l.pro === proId && l.status === 'available');
        amt = U.sum(mine.map(l => l.amount));
        if (amt < BV.config.minPayout) { amt = 0; return; }
        mine.forEach(l => { l.status = 'paid_out'; });
        s.payouts.unshift({ id: U.uid('po'), pro: proId, amount: amt, method, number, ts: Date.now(), simulated: true });
      });
      return amt;
    },

    /* ---------- care team (BUSHEMI operations) ---------- */
    careTeamAssign(id) {
      S().update(s => {
        const b = find(s, id);
        if (!b || b.status !== 'assigning') return;
        const m = BV.match.assignManaged(b, s);
        if (!m) {
          log(b, 'No managed professional is free for that window. The care team will call to agree another time.', 'care_team');
          b.noMatch = true;
          notify(s, toPatient(s, b), 'We could not match a professional for that window. The care team will call you to agree another time.', '/booking/' + b.id);
          return;
        }
        b.pro = m.pro.id; b.time = m.time; b.status = 'confirmed'; b.noMatch = false;
        b.match = { score: Math.round(m.score), reasons: m.reasons };
        log(b, m.pro.name + ' assigned', 'care_team');
        notify(s, toPatient(s, b), m.pro.name + ' will see you ' + U.when(b.date, b.time) + '. Tap to view their profile.', '/booking/' + b.id);
        notify(s, toPro(m.pro.id), 'New assignment: ' + svcName(b) + ' for ' + U.firstName(recName(s, b)) + ', ' + U.when(b.date, b.time), '/request/' + b.id);
      });
    },
    sweep() {
      const s0 = S().get(), now = Date.now();
      const need = s0.bookings.some(b =>
        (b.status === 'assigning' && !b.noMatch && now - b.timeline[b.timeline.length - 1].ts > 7000) ||
        (b.status === 'requested' && b.expiresAt && now > b.expiresAt) ||
        (b.report && b.report.review === 'pending' && now - b.report.submittedAt > 12000));
      if (!need) return;
      S().update(s => {
        s.bookings.forEach(b => {
          if (b.status === 'requested' && b.expiresAt && now > b.expiresAt) {
            b.status = 'expired'; b.payment.state = 'released';
            log(b, 'No answer in ' + BV.config.requestResponseHours + ' hours. Payment hold released.', 'system');
            notify(s, toPatient(s, b), pro(s, b.pro).name + ' did not respond in time. Your payment hold was released. Tap to see similar professionals.', '/booking/' + b.id);
            notify(s, toPro(b.pro), 'A request expired because it was not answered.', null);
          }
          if (b.report && b.report.review === 'pending' && now - b.report.submittedAt > 12000) {
            b.report.review = 'approved';
            log(b, 'Clinical lead reviewed the report', 'care_team');
            notify(s, toPro(b.pro), 'Your report for ' + svcName(b) + ' was reviewed by the clinical lead.', null);
          }
        });
        s.bookings.filter(b => b.status === 'assigning' && !b.noMatch && now - b.timeline[b.timeline.length - 1].ts > 7000).forEach(b => {
          const m = BV.match.assignManaged(b, s);
          if (!m) { b.noMatch = true; log(b, 'No managed professional is free for that window. The care team will call to agree another time.', 'care_team'); notify(s, toPatient(s, b), 'We could not match a professional for that window. The care team will call you to agree another time.', '/booking/' + b.id); return; }
          b.pro = m.pro.id; b.time = m.time; b.status = 'confirmed';
          b.match = { score: Math.round(m.score), reasons: m.reasons };
          log(b, m.pro.name + ' assigned', 'care_team');
          notify(s, toPatient(s, b), m.pro.name + ' will see you ' + U.when(b.date, b.time) + '. Tap to view their profile.', '/booking/' + b.id);
          notify(s, toPro(m.pro.id), 'New assignment: ' + svcName(b) + ' for ' + U.firstName(recName(s, b)) + ', ' + U.when(b.date, b.time), '/request/' + b.id);
        });
      });
    },

    /* ---------- queries ---------- */
    forHousehold(s, hh) { return s.bookings.filter(b => b.household === hh).sort((a, b) => BV.avail.startTs(a) - BV.avail.startTs(b)); },
    forPro(s, proId) { return s.bookings.filter(b => b.pro === proId); },
    byId(s, id) { return find(s, id); }
  };

  /* ---------- messaging ---------- */
  const OUT = () => 'bv3.outbox.' + BV.app;
  const outbox = {
    read() { try { return JSON.parse(BV.ls.get(OUT()) || '[]'); } catch (e) { return []; } },
    write(a) { BV.ls.set(OUT(), JSON.stringify(a)); }
  };
  const CANNED = {
    pro: ['Thank you, noted. I will see you then.', 'Of course, no problem at all.', 'Please keep the medicines and any recent reports ready.', 'Got it. Is there anything else I should know?'],
    care_team: ['Thanks for your message. The care team has noted it and will update this booking.', 'Understood. We have passed that to the professional.', 'Thank you. A coordinator will call you if we need anything else.']
  };
  const msg = {
    thread(s, bookingId) {
      const mine = s.messages.filter(m => m.b === bookingId);
      const q = outbox.read().filter(m => m.b === bookingId).map(m => Object.assign({}, m, { state: 'queued' }));
      return mine.concat(q).sort((a, b) => a.ts - b.ts);
    },
    /* Which bookings have a conversation, with the latest line, for either role */
    inbox(s, role, id) {
      const bs = role === 'patient' ? s.bookings.filter(b => b.household === id) : s.bookings.filter(b => b.pro === id);
      return bs.map(b => {
        const t = msg.thread(s, b.id), last = t[t.length - 1];
        const unread = t.filter(m => m.from.role !== role && !(m.readBy || []).includes(role)).length;
        return { b, last, unread };
      }).filter(x => x.last || OPEN.includes(x.b.status)).sort((a, c) => ((c.last && c.last.ts) || c.b.createdAt) - ((a.last && a.last.ts) || a.b.createdAt));
    },
    unreadCount(s, role, id) { return msg.inbox(s, role, id).reduce((n, x) => n + x.unread, 0); },
    markRead(bookingId, role) {
      const s = S().get();
      if (!s.messages.some(m => m.b === bookingId && m.from.role !== role && !(m.readBy || []).includes(role))) return;
      S().update(st => { st.messages.forEach(m => { if (m.b === bookingId && m.from.role !== role && !(m.readBy || []).includes(role)) (m.readBy = m.readBy || []).push(role); }); });
    },
    send(bookingId, from, text) {
      text = text.trim(); if (!text) return;
      const m = { id: U.uid('m'), b: bookingId, from, text, ts: Date.now(), readBy: [from.role] };
      if (!BV.Net.online()) { const o = outbox.read(); o.push(m); outbox.write(o); BV.Router.refresh(); return 'queued'; }
      S().update(s => { s.messages.push(m); });
      msg.autoReply(bookingId, from);
      return 'sent';
    },
    flush() {
      const o = outbox.read(); if (!o.length || !BV.Net.online()) return;
      outbox.write([]);
      S().update(s => { o.forEach(m => { m.ts = Date.now(); s.messages.push(m); }); });
      BV.UI.toast('Waiting messages sent');
      o.forEach(m => msg.autoReply(m.b, m.from));
    },
    /* Replies are simulated ONLY when the other app is not open. If you have both phones open, the conversation is real. */
    autoReply(bookingId, from) {
      const s = S().get(), b = find(s, bookingId);
      if (!b) return;
      if (from.role === 'pro') {
        if (BV.Presence.active('patient')) return;
        const hh = s.households.find(h => h.id === b.household), owner = hh.members[0];
        setTimeout(() => {
          const st = S().get(), bb = find(st, bookingId);
          if (!bb || !OPEN.includes(bb.status)) return;
          const pool = ['Thank you, that is helpful.', 'Okay, we will be ready.', 'Great, see you then.', 'Thanks for letting us know.'];
          S().update(x => { x.messages.push({ id: U.uid('m'), b: bookingId, from: { role: 'patient', id: owner.id, name: owner.name }, text: pool[Math.floor(Math.random() * pool.length)], ts: Date.now(), readBy: ['patient'], simulated: true }); });
        }, 3500 + Math.random() * 3000);
        return;
      }
      if (from.role !== 'patient') return;
      const careTeam = b.model === 'managed';
      if (!careTeam && BV.Presence.active('pro')) return;
      const delay = 3500 + Math.random() * 3000;
      setTimeout(() => {
        const st = S().get(), bb = find(st, bookingId);
        if (!bb || !OPEN.includes(bb.status)) return;
        const p = bb.pro ? pro(st, bb.pro) : null;
        const sender = careTeam ? { role: 'care_team', id: 'ct', name: 'BUSHEMI Care Team' } : { role: 'pro', id: p.id, name: p.name };
        const pool = CANNED[careTeam ? 'care_team' : 'pro'];
        S().update(x => { x.messages.push({ id: U.uid('m'), b: bookingId, from: sender, text: pool[Math.floor(Math.random() * pool.length)], ts: Date.now(), readBy: [sender.role], simulated: true }); });
      }, delay);
    }
  };
  BV.flushOutbox = () => msg.flush();

  /* ---------- notifications ---------- */
  const notif = {
    list(s, role, id) { return s.notifications.filter(n => n.to.role === role && n.to.id === id); },
    unread(s, role, id) { return notif.list(s, role, id).filter(n => !n.read).length; },
    markAllRead(role, id) { S().update(s => { s.notifications.forEach(n => { if (n.to.role === role && n.to.id === id) n.read = true; }); }); }
  };

  /* ---------- background simulator for the people BUSHEMI cannot be in a prototype ---------- */
  const ops = {
    start() { if (this._t) return; this._t = setInterval(() => { try { B.sweep(); } catch (e) { console.error(e); } }, 3000); B.sweep(); }
  };

  BV.booking = B; BV.msg = msg; BV.notif = notif; BV.ops = ops;
})(window.BV);
