/* BUSHEMI v3 · domain/rules.js
   Business rules that both apps share, written as plain functions of the data:
     pricing       what a booking costs, and who gets what (managed vs independent)
     availability  which times a professional (or the managed team) can really take
     matching      how BUSHEMI assigns a managed professional, and suggests alternatives
     verification  what "verified" means and how complete it is
     ratings       a professional's rating from seeded history plus new reviews                  */
(function (BV) {
  'use strict';
  const U = BV.u, cfg = () => BV.config;

  /* =============== PRICING =============== */
  const ACTIVE = ['requested', 'assigning', 'confirmed', 'en_route', 'in_progress', 'report_due'];
  const rateOf = (pro, svcId) => { const s = pro && pro.services.find(x => x.id === svcId); return s ? s.rate : 0; };

  const pricing = {
    rateOf,
    quote(o) {
      const svc = o.service, c = cfg();
      let base, fee = 0, lines = [];
      if (o.model === 'managed') {
        base = svc.managedPrice;
      } else {
        base = rateOf(o.pro, svc.id);
        fee = Math.round(base * c.fees.independentServicePct / 100);
      }
      const discount = o.voucher ? Math.round(base * c.voucher.pct / 100) : 0;
      const total = base - discount + fee;
      const proPayout = o.model === 'managed' ? svc.staffPay : Math.round(base * (1 - c.fees.proCommissionPct / 100));
      if (o.model === 'managed') {
        lines.push({ label: svc.name + ', all-inclusive', amount: base, note: 'Coordination, a checked professional, follow-up and a replacement if we cannot make it' });
      } else {
        lines.push({ label: (o.pro ? o.pro.name : 'Professional') + '\'s rate', amount: base, note: 'Set by the professional' });
        lines.push({ label: 'BUSHEMI service fee', amount: fee, note: 'Verification, secure payment hold and support' });
      }
      if (discount) lines.push({ label: 'Welcome voucher ' + c.voucher.code, amount: -discount, tone: 'ok' });
      return { model: o.model, base, serviceFee: fee, discount, total, proPayout, voucher: !!discount, lines };
    },
    /* Cancellation terms for a booking right now */
    cancellation(b, now) {
      now = now || Date.now();
      const p = cfg().cancellation[b.model];
      if (b.status === 'requested' || b.status === 'assigning') return { free: true, fee: 0, text: 'Free to cancel. Nothing has been confirmed yet.' };
      const start = BV.avail.startTs(b);
      const hrs = (start - now) / 3600000;
      if (hrs >= p.freeHoursBefore) return { free: true, fee: 0, text: 'Free to cancel until ' + p.freeHoursBefore + ' hours before the visit.' };
      const fee = Math.round(b.price.base * p.lateFeePct / 100);
      return { free: false, fee, text: 'Inside ' + p.freeHoursBefore + ' hours of the visit a late-cancellation fee of ' + U.money(fee) + ' applies.' };
    }
  };

  /* =============== AVAILABILITY =============== */
  const SHIFTS = {
    morning: { label: 'Morning', range: '08:00 to 12:00', from: '08:00', to: '12:00', slots: ['08:00', '09:00', '10:00', '11:00'] },
    afternoon: { label: 'Afternoon', range: '12:00 to 17:00', from: '12:00', to: '17:00', slots: ['12:00', '13:00', '14:00', '15:00', '16:00'] },
    evening: { label: 'Evening', range: '17:00 to 20:00', from: '17:00', to: '20:00', slots: ['17:00', '18:00', '19:00'] },
    night: { label: 'Night', range: '20:00 to 23:00', from: '20:00', to: '23:00', slots: ['20:00', '21:00', '22:00'] }
  };
  const SHIFT_ORDER = ['morning', 'afternoon', 'evening', 'night'];

  const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

  /* Working windows (minutes) for the shifts a professional has switched on, merging back-to-back shifts */
  function windows(shifts) {
    const w = [];
    SHIFT_ORDER.filter(k => shifts.includes(k)).forEach(k => {
      const a = U.mins(SHIFTS[k].from), b = U.mins(SHIFTS[k].to);
      if (w.length && w[w.length - 1][1] === a) w[w.length - 1][1] = b; else w.push([a, b]);
    });
    return w;
  }

  const avail = {
    SHIFTS, SHIFT_ORDER,
    slotShift(t) { return SHIFT_ORDER.find(k => SHIFTS[k].slots.includes(t)); },
    startTs(b) {
      const t = b.time || (b.window ? SHIFTS[b.window].from : '09:00');
      return U.slotTs(b.date, t);
    },
    /* Every slot a professional offers on a day, each marked ok or not (and why) */
    proSlots(pro, svc, dk, state, ignoreId) {
      state = state || BV.state();
      const a = pro.availability, out = [];
      const day = U.parseKey(dk), dur = svc.duration || 60;
      const buf = svc.mode === 'video' ? 10 : cfg().travelBufferMin;
      const wins = windows(a.shifts);
      const dayOn = a.days[U.wdIndex(day)];
      SHIFT_ORDER.filter(k => a.shifts.includes(k)).forEach(k => SHIFTS[k].slots.forEach(t => {
        const s = U.mins(t);
        if (!wins.some(w => s >= w[0] && s + dur <= w[1])) return;      // visit must fit inside working time
        let reason = null;
        if (!a.online) reason = 'paused';
        else if (!dayOn) reason = 'off';
        else if (a.blocked.includes(dk)) reason = 'blocked';
        else if (U.slotTs(dk, t) < Date.now() + cfg().leadHours * 3600000) reason = 'past';
        else if (state.bookings.some(b => b.pro === pro.id && b.id !== ignoreId && ACTIVE.includes(b.status) && b.date === dk && b.time &&
          overlap(s, s + dur, U.mins(b.time) - buf, U.mins(b.time) + (b.durationMin || 60) + buf))) reason = 'booked';
        out.push({ time: t, shift: k, ok: !reason, reason });
      }));
      return out;
    },
    freeCount(pro, svc, dk, state) { return this.proSlots(pro, svc, dk, state).filter(s => s.ok).length; },
    nextAvailable(pro, svc, state, days) {
      state = state || BV.state();
      for (let i = 0; i < (days || 14); i++) {
        const dk = U.dkey(U.addDays(U.today(), i));
        const s = this.proSlots(pro, svc, dk, state).find(x => x.ok);
        if (s) return { date: dk, time: s.time };
      }
      return null;
    },
    /* Which arrival windows can the BUSHEMI-managed team offer on a day, for a service and an area? */
    managedWindows(svc, dk, area, state) {
      state = state || BV.state();
      const pool = match.managedPool(svc, area, state);
      return ['morning', 'afternoon', 'evening'].map(k => {
        const n = pool.filter(p => this.proSlots(p, svc, dk, state).some(s => s.ok && s.shift === k)).length;
        return { key: k, label: SHIFTS[k].label, range: SHIFTS[k].range, ok: n > 0, limited: n === 1 };
      });
    },
    nextManaged(svc, area, state) {
      for (let i = 0; i < 10; i++) {
        const dk = U.dkey(U.addDays(U.today(), i));
        const w = this.managedWindows(svc, dk, area, state).find(x => x.ok);
        if (w) return { date: dk, window: w.key };
      }
      return null;
    }
  };

  /* =============== MATCHING =============== */
  const match = {
    covers(pro, area, svc) { return svc && svc.mode === 'video' ? true : !area || pro.areas.includes(area); },
    offers(pro, svcId) { return pro.services.some(s => s.id === svcId); },
    managedPool(svc, area, state) {
      state = state || BV.state();
      if (svc.mode !== 'video' && area && !BV.data.managedCoverage.includes(area)) return [];
      return state.pros.filter(p => p.model === 'managed' && p.verification.status === 'verified' && this.offers(p, svc.id) && this.covers(p, area, svc));
    },
    /* Picks a managed professional for a booking. Returns {pro, time, score, reasons} or null. */
    assignManaged(b, state) {
      state = state || BV.state();
      const svc = BV.svc(b.service), win = b.window || 'morning';
      const rec = state.recipients.find(r => r.id === b.recipient);
      const cands = [];
      this.managedPool(svc, b.address.area, state).forEach(p => {
        const slot = avail.proSlots(p, svc, b.date, state, b.id).find(s => s.ok && s.shift === win);
        if (!slot) return;
        let score = 50 + BV.rules.rating(p, state).rating * 4;
        const why = [];
        if (svc.mode !== 'video') why.push('Works in ' + b.address.area);
        if (state.bookings.some(x => x.pro === p.id && x.recipient === b.recipient && x.status === 'completed')) { score += 25; why.unshift('Has cared for ' + U.firstName(rec.name) + ' before'); }
        const lang = state.households.find(h => h.id === b.household).language;
        if (lang && p.languages.includes(lang)) { score += 8; why.push('Speaks ' + lang); }
        score -= state.bookings.filter(x => x.pro === p.id && x.date === b.date && ACTIVE.includes(x.status)).length * 4;
        why.push('Verified ' + BV.data.proTypes[p.type].label.toLowerCase());
        cands.push({ pro: p, time: slot.time, score, reasons: why });
      });
      cands.sort((x, y) => y.score - x.score);
      return cands[0] || null;
    },
    /* If an independent request fails, offer similar professionals who can really do it */
    alternatives(b, state) {
      state = state || BV.state();
      const svc = BV.svc(b.service);
      return state.pros.filter(p => p.model === 'independent' && p.id !== b.pro && p.verification.status === 'verified' && this.offers(p, svc.id) && this.covers(p, b.address.area, svc))
        .map(p => ({ pro: p, next: avail.nextAvailable(p, svc, state) })).filter(x => x.next)
        .sort((x, y) => BV.rules.rating(y.pro, state).rating - BV.rules.rating(x.pro, state).rating).slice(0, 3);
    }
  };

  /* =============== VERIFICATION =============== */
  const CHECK_LABELS = {
    identity: ['Identity', 'National Registration Card or passport matched to the person'],
    qualification: ['Qualification', 'Certificate or degree checked with the issuing school'],
    registration: ['Regulator registration', 'Checked against the regulator\'s published records'],
    police: ['Police clearance', 'Clearance certificate sighted and recorded'],
    references: ['Professional references', 'Two previous employers or supervisors contacted'],
    interview: ['BUSHEMI interview', 'Conversation with the BUSHEMI clinical lead'],
    assessment: ['Skills assessment', 'Practical assessment before joining the care team']
  };
  const verification = {
    CHECK_LABELS,
    checksFor(pro) {
      const t = BV.data.proTypes[pro.type];
      const list = ['identity', 'qualification'];
      if (t.regulator) list.push('registration');
      list.push('police', 'references');
      if (pro.model === 'managed' || pro.applyingManaged) list.push('interview', 'assessment');
      return list;
    },
    label(pro, id) {
      if (id === 'registration') return [BV.data.proTypes[pro.type].regulator + ' registration', CHECK_LABELS.registration[1]];
      if (id === 'qualification' && pro.type === 'caregiver') return ['Training certificate', 'Care training certificate checked with the provider'];
      return CHECK_LABELS[id];
    },
    summary(pro) {
      const v = pro.verification, ids = this.checksFor(pro);
      const passed = ids.filter(i => v.checks[i] && v.checks[i].status === 'passed').length;
      const expiring = ids.find(i => v.checks[i] && v.checks[i].expires && (v.checks[i].expires - Date.now()) < 60 * 86400000 && (v.checks[i].expires - Date.now()) > 0);
      const map = {
        verified: ['Verified', 'ok', 'All checks passed'],
        in_review: ['In review', 'warn', 'BUSHEMI is checking the details'],
        action_needed: ['Action needed', 'err', 'Something needs your attention'],
        draft: ['Not submitted', 'neutral', 'Finish your profile to submit it for checking'],
        suspended: ['Paused', 'err', 'Bookings are paused while BUSHEMI reviews a concern']
      }[v.status];
      return { status: v.status, label: map[0], tone: map[1], text: map[2], passed, total: ids.length, expiring: expiring || null };
    }
  };

  /* =============== RATINGS =============== */
  const rules = {
    rating(pro, state) {
      state = state || BV.state();
      const rs = state.reviews.filter(r => r.pro === pro.id);
      const n = pro.stats.reviews + rs.length;
      const total = pro.stats.rating * pro.stats.reviews + U.sum(rs.map(r => r.rating));
      return { rating: n ? Math.round(total / n * 10) / 10 : 0, count: n };
    },
    /* Reviews to display: real new ones first, then illustrative history */
    reviewList(pro, state) {
      state = state || BV.state();
      const fresh = state.reviews.filter(r => r.pro === pro.id).sort((a, b) => b.ts - a.ts).map(r => ({ name: r.name, text: r.text, rating: r.rating, tags: r.tags, ts: r.ts, fresh: true }));
      const base = [0, 1, 2].map(i => BV.data.reviewPool[(U.hash(pro.id) + i) % BV.data.reviewPool.length]).map((r, i) => ({ name: r[0], text: r[1], rating: r[2], ts: Date.now() - (i + 2) * 9 * 86400000 }));
      return fresh.concat(base);
    },
    pro(id, state) { return (state || BV.state()).pros.find(p => p.id === id); },
    svcOfPro(pro, svcId) { return BV.svc(svcId); },
    primarySvc(pro) { return BV.svc(pro.services[0].id); },
    minRate(pro) { return Math.min.apply(null, pro.services.map(s => s.rate)); }
  };

  BV.pricing = pricing; BV.avail = avail; BV.match = match; BV.verify = verification; BV.rules = rules; BV.ACTIVE = ACTIVE;
})(window.BV);
