/* BUSHEMI v3 · patient/app.js · boots the patient experience */
(function (BV) {
  'use strict';
  const pt = BV.pt;

  try { if (BV.ls.get('bv3.text') === 'large') document.documentElement.dataset.text = 'large'; } catch (e) { /* ignore */ }

  BV.demoExtras = () => [
    { label: 'Make Grace accept my new request', fn: () => {
      const hh = pt.hh(); const b = BV.state().bookings.find(x => x.household === hh.id && x.status === 'requested');
      if (!b) { BV.UI.toast('No request is waiting for a professional'); return; }
      BV.booking.accept(b.id, b.pro); BV.UI.toast('Accepted as the professional'); },
    },
    { label: 'Make the professional set off now', fn: () => {
      const hh = pt.hh(); const b = BV.state().bookings.find(x => x.household === hh.id && x.status === 'confirmed' && x.mode !== 'video');
      if (!b) { BV.UI.toast('No confirmed home visit to start'); return; }
      BV.booking.startTravel(b.id, b.pro, 8); BV.UI.toast('Professional is on the way'); } },
    { label: 'Make my open request expire', fn: () => {
      const hh = pt.hh(); const b = BV.state().bookings.find(x => x.household === hh.id && x.status === 'requested');
      if (!b) { BV.UI.toast('No request is waiting'); return; }
      BV.Store.update(s => { s.bookings.find(x => x.id === b.id).expiresAt = Date.now() - 1000; }); BV.booking.sweep(); BV.UI.toast('Request expired'); } }
  ];

  BV.shell.init({
    app: 'patient', name: 'BUSHEMI', start: '/',
    tabs: [
      { id: 'home', path: '/', icon: 'home', label: 'Home' },
      { id: 'find', path: '/find', icon: 'search', label: 'Find care' },
      { id: 'bookings', path: '/bookings', icon: 'cal', label: 'Visits' },
      { id: 'messages', path: '/messages', icon: 'chat', label: 'Messages' },
      { id: 'care', path: '/care', icon: 'heart', label: 'Care' }
    ],
    badges() { const hh = pt.hh(); if (!hh) return {}; const n = BV.msg.unreadCount(BV.state(), 'patient', hh.id); return n ? { messages: n } : {}; },
    onReset() { BV.Router.go('/welcome', { replace: true }); }
  });
  BV.ops.start();
})(window.BV);
