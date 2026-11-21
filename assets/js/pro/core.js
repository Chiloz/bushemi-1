/* BUSHEMI v3 · pro/core.js
   Who is signed in as a professional, derived work lists, and the route guard.
   The professional experience is organised around WORK (requests, schedule, visits, earnings),
   not around browsing. */
(function (BV) {
  'use strict';
  const U = BV.u, S = BV.Session;

  const pr = BV.pr = {
    me() { return BV.state().pros.find(p => p.id === S.get('pro')); },
    managed() { const p = this.me(); return !!p && p.model === 'managed'; },
    verified() { const p = this.me(); return !!p && p.verification.status === 'verified'; },
    mine() { const p = this.me(); return p ? BV.state().bookings.filter(b => b.pro === p.id) : []; },
    pending() { return this.mine().filter(b => b.status === 'requested').sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0)); },
    changes() { return this.mine().filter(b => b.change && b.status === 'confirmed'); },
    active() { return this.mine().filter(b => ['en_route', 'in_progress', 'report_due'].includes(b.status)); },
    upcoming() { return this.mine().filter(b => b.status === 'confirmed').sort((a, b) => BV.avail.startTs(a) - BV.avail.startTs(b)); },
    onDay(dk) { return this.mine().filter(b => b.date === dk && BV.booking.isOpen(b) && b.status !== 'requested').sort((a, b) => BV.avail.startTs(a) - BV.avail.startTs(b)); },
    /* the one job the professional should act on next */
    nextJob() { return this.active()[0] || this.upcoming()[0] || null; },
    earnings() {
      const p = this.me(), L = BV.state().ledger.filter(l => l.pro === p.id), sum = f => U.sum(L.filter(f).map(l => l.amount));
      const startWeek = U.addDays(U.today(), -6).getTime(), startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      return { available: sum(l => l.status === 'available'), accrued: sum(l => l.status === 'accrued'), paid: sum(l => l.status === 'paid_out'), week: sum(l => l.ts >= startWeek), month: sum(l => l.ts >= startMonth), ledger: L.sort((a, b) => b.ts - a.ts), count: L.length };
    },
    redirect(path) { return { html: '', tab: null, onMount() { BV.Router.go(path, { replace: true }); } }; },
    /* Suggested checks for a patient's conditions. A demonstration of "care plan" logic, not clinical guidance. */
    carePlan(r) {
      const c = r.conditions.join(' ').toLowerCase(), plan = [];
      if (/pressure|hypert/.test(c)) plan.push('Check and record blood pressure');
      if (/diabet|sugar/.test(c)) plan.push('Check blood sugar; look at the feet');
      if (/surgery|wound|dress/.test(c)) plan.push('Inspect wound for redness, swelling or discharge');
      if (/arthritis|stroke|mobility/.test(c)) plan.push('Check mobility; note any new pain');
      if (r.meds.length) plan.push('Confirm medicines were taken as prescribed');
      if (r.age >= 65) plan.push('Ask about falls, appetite and drinking enough water');
      if (!plan.length) plan.push('Ask how the person has been since the last visit');
      return plan;
    }
  };

  BV.prroute = (path, fn) => BV.route(path, ctx => pr.me() ? fn(ctx) : pr.redirect('/welcome'));
})(window.BV);
