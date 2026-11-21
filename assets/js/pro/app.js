/* BUSHEMI v3 · pro/app.js · boots the professional experience */
(function (BV) {
  'use strict';
  const pr = BV.pr, U = BV.u;
  try { if (BV.ls.get('bv3.text') === 'large') document.documentElement.dataset.text = 'large'; } catch (e) { /* ignore */ }

  const needPro = () => { if (!pr.me()) { BV.UI.toast('Sign in first'); return false; } return true; };

  BV.demoExtras = () => [
    { label: 'Simulate a new patient request', fn: () => {
      if (!needPro()) return;
      const me = pr.me(), s = BV.state();
      const svcId = (me.services[0] || {}).id || 'nurse-visit', svc = BV.svc(svcId);
      const rec = s.recipients.find(r => r.household === 'h2') || s.recipients[0], hh = s.households.find(h => h.id === rec.household);
      const dk = U.dkey(U.addDays(U.today(), 2)), area = (me.areas || [])[0] || 'Woodlands', ad = s.addresses.find(a => a.household === hh.id) || { label: 'Home', line: 'Plot 1', landmark: '' };
      const model = me.model;
      const q = BV.pricing.quote({ model, service: svc, pro: me, voucher: false });
      const id = U.uid('b');
      BV.Store.update(st => {
        st.bookings.push({ id, model, service: svcId, pro: me.id, household: hh.id, recipient: rec.id, date: dk, time: '10:00', window: 'morning', mode: svc.mode === 'video' ? 'video' : 'home',
          address: { label: ad.label, area, line: ad.line, landmark: ad.landmark || '' }, notes: 'Please come after breakfast.', status: model === 'managed' ? 'confirmed' : 'requested', expiresAt: Date.now() + 2 * 3600000, price: q, pay: 'mtn', num: '096 000 0399', payState: 'held',
          timeline: [{ ts: Date.now(), label: 'Request sent', by: 'patient' }] });
        st.notifications.push({ id: U.uid('n'), to: { role: 'pro', id: me.id }, text: 'New request: ' + svc.name + ' in ' + area, ts: Date.now(), read: false, link: '/request/' + id });
      });
      BV.UI.toast('A new request arrived');
    } },
    { label: 'Approve my verification', fn: () => {
      if (!needPro()) return;
      BV.Store.update(s => { const p = s.pros.find(x => x.id === pr.me().id); BV.verify.checksFor(p).forEach(i => { const c = p.verification.checks[i] || {}; p.verification.checks[i] = Object.assign(c, { status: 'passed', date: Date.now() }); }); p.verification.status = 'verified'; p.verification.verifiedAt = Date.now(); });
      BV.UI.toast('Verified. You are now visible to patients');
    } },
    { label: 'Ask me to re-upload a document', fn: () => {
      if (!needPro()) return;
      BV.Store.update(s => { const p = s.pros.find(x => x.id === pr.me().id); p.verification.checks.police = { status: 'needs_action', note: 'The photo was blurry. Please upload it again.' }; p.verification.status = 'action_needed'; });
      BV.UI.toast('Verification needs action');
    } },
    { label: 'Patient cancels my next visit', fn: () => {
      if (!needPro()) return;
      const b = pr.upcoming()[0]; if (!b) { BV.UI.toast('No upcoming visit to cancel'); return; }
      BV.booking.cancel(b.id, 'patient', 'Plans changed'); BV.UI.toast('The patient cancelled');
    } },
    { label: 'Care team assigns me a visit', fn: () => {
      if (!needPro()) return;
      const b = BV.state().bookings.find(x => x.status === 'assigning'); if (!b) { BV.UI.toast('No visit is waiting for assignment. Book a managed visit in the patient app.'); return; }
      BV.booking.careTeamAssign(b.id); BV.UI.toast('Care team ran assignment');
    } }
  ];

  BV.shell.init({
    app: 'pro', name: 'BUSHEMI Pro', start: '/',
    tabs: [
      { id: 'today', path: '/', icon: 'home', label: 'Today' },
      { id: 'requests', path: '/requests', icon: 'bell', label: 'Requests' },
      { id: 'schedule', path: '/schedule', icon: 'cal', label: 'Schedule' },
      { id: 'messages', path: '/messages', icon: 'chat', label: 'Messages' },
      { id: 'me', path: '/me', icon: 'user', label: 'Me' }
    ],
    badges() {
      const p = pr.me(); if (!p) return {};
      const o = {}, n = pr.pending().length + pr.changes().length, m = BV.msg.unreadCount(BV.state(), 'pro', p.id);
      if (n) o.requests = n; if (m) o.messages = m; return o;
    },
    onReset() { BV.Router.go('/welcome', { replace: true }); }
  });
  BV.ops.start();
})(window.BV);
