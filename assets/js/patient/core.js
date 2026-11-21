/* BUSHEMI v3 · patient/core.js
   Who is signed in, which person is being cared for, which area is selected, and the route guard. */
(function (BV) {
  'use strict';
  const U = BV.u, S = BV.Session;

  const pt = BV.pt = {
    hh() { return BV.state().households.find(h => h.id === S.get('household')); },
    user() { const h = this.hh(); return h && h.members.find(m => m.id === S.get('user')) || (h && h.members[0]); },
    role() { const u = this.user(); return u ? u.role : null; },
    canBook() { return this.role() !== 'viewer'; },
    people() { const h = this.hh(); return h ? BV.state().recipients.filter(r => r.household === h.id) : []; },
    addresses() { const h = this.hh(); return h ? BV.state().addresses.filter(a => a.household === h.id) : []; },
    cur() { const p = this.people(); return p.find(x => x.id === S.get('recipient')) || p[0]; },
    area() { return S.get('area') || (this.addresses()[0] && this.addresses()[0].area) || 'Chalala'; },
    firstName() { const u = this.user(); return u ? U.firstName(u.name) : ''; },
    greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; },
    /* Things that need the family's attention, used on Home and as badges */
    todo() {
      const s = BV.state(), hh = this.hh(); if (!hh) return [];
      const bs = BV.booking.forHousehold(s, hh.id), out = [];
      bs.filter(b => b.status === 'completed' && !b.review && b.pro).forEach(b => out.push({ type: 'review', b }));
      bs.filter(b => b.payment.state === 'due').forEach(b => out.push({ type: 'pay', b }));
      bs.filter(b => ['declined', 'expired'].includes(b.status) && Date.now() - b.timeline[b.timeline.length - 1].ts < 3 * 86400000).forEach(b => out.push({ type: 'retry', b }));
      bs.filter(b => b.status === 'cancelled' && b.cancel && b.cancel.by !== 'patient' && Date.now() - b.cancel.ts < 3 * 86400000).forEach(b => out.push({ type: 'retry', b }));
      return out;
    },
    dueMeds(recipient) {
      const dk = U.dkey(new Date()), out = [];
      recipient.meds.forEach(m => m.times.forEach(t => { out.push({ med: m, time: t, done: !!m.log[dk + '_' + t], late: !m.log[dk + '_' + t] && U.mins(t) < new Date().getHours() * 60 + new Date().getMinutes() }); }));
      return out.sort((a, b) => U.mins(a.time) - U.mins(b.time));
    },
    redirect(path) { return { html: '', tab: null, onMount() { BV.Router.go(path, { replace: true }); } }; }
  };

  /* Route helper: signed-in routes only */
  BV.proute = (path, fn) => BV.route(path, ctx => {
    if (!pt.hh()) return pt.redirect('/welcome');
    return fn(ctx);
  });
})(window.BV);
