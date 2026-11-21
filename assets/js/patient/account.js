/* BUSHEMI v3 · patient/account.js
   Account settings, payments and receipts, privacy and data controls, and the "Why trust BUSHEMI" page. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pt = BV.pt, D = BV.Draft, S = BV.Session;
  const PREF = { push: ['App notifications', 'Updates inside the app'], sms: ['SMS reminders', 'Works without data. Standard rates may apply.'], wa: ['WhatsApp updates', 'Booking updates and reminders on WhatsApp'], meds: ['Medicine reminders', 'At the times you set'], visit: ['Visit reminders', 'The day before and when the professional sets off'] };
  const prefs = () => Object.assign({ push: true, sms: true, wa: false, meds: true, visit: true }, pt.hh().prefs || {});
  const LANGS = ['English', 'Bemba', 'Nyanja'];

  function account() {
    const hh = pt.hh(), u = pt.user(), large = BV.ls.get('bv3.text') === 'large';
    const row = (ic, tone, label, sub, act, v) => '<button class="list-row" data-act="' + act + '"' + (v ? ' data-v="' + v + '"' : '') + '><span class="ic-tile ' + tone + '">' + I(ic) + '</span><span class="grow"><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + I('chev', 'chev') + '</button>';
    const html = C.topbar({ title: 'Account', back: '/' }) +
      '<div class="card" style="display:flex;gap:14px;align-items:center">' + U.avatar(u.name, 60) + '<div class="grow"><b style="font-size:1.1rem">' + esc(u.name) + '</b><div class="muted small">' + esc(u.phone) + '</div><span class="badge info mt-1">' + esc(u.role === 'owner' ? 'Account owner' : u.role === 'manager' ? 'Can book' : 'View only') + '</span></div></div>' +
      '<div class="card" style="padding:4px 16px">' + row('users', 'green', 'Family and access', hh.members.length + ' ' + U.plural(hh.members.length, 'person', 'people') + ' · ' + pt.people().length + ' receiving care', 'nav', '/family') +
      row('wallet', 'amber', 'Payments and receipts', 'Mobile money, card and receipts', 'nav', '/payments') + row('bell', '', 'Notifications', 'App, SMS and WhatsApp', 'acc.notif') + row('chat', 'indigo', 'Language', hh.language + ' · professionals who speak it are shown first', 'acc.lang') + '</div>' +
      '<div class="card">' + C.toggle({ label: 'Larger text', sub: 'Easier to read for everyone in the family', on: large, act: 'acc.large' }) + '</div>' +
      '<div class="card" style="padding:4px 16px">' + row('shield', 'green', 'Why you can trust BUSHEMI', 'Verification, payments, privacy', 'nav', '/trust') + row('lock', '', 'Privacy and your data', 'What we keep, download or delete', 'acc.privacy') + row('phone', 'teal', 'Help and contact', 'Talk to the care team', 'acc.help') + '</div>' +
      '<button class="btn secondary block mt-3" data-act="acc.signout">' + I('logout', 'sm') + 'Sign out</button>' +
      '<p class="muted small center mt-4">BUSHEMI v3 prototype · demo data</p>';
    return { html, tab: null, title: 'Account' };
  }
  BV.act('acc.notif', () => {
    const p = prefs();
    BV.UI.sheet('<h2>Notifications</h2><p class="muted small mt-1">Choose how we reach your family. SMS works even without data.</p><div class="mt-3">' + Object.keys(PREF).map(k => C.toggle({ label: PREF[k][0], sub: PREF[k][1], on: p[k], act: 'acc.pref', v: k })).join('') + '</div>' + C.simNote('Prototype: SMS and WhatsApp messages are not actually sent.'), { label: 'Notifications' });
  });
  BV.act('acc.pref', v => { const p = prefs(); p[v] = !p[v]; BV.Store.update(s => { s.households.find(h => h.id === pt.hh().id).prefs = p; }); BV.acts['acc.notif'](); });
  BV.act('acc.lang', () => {
    BV.UI.sheet('<h2>Language</h2><p class="muted small mt-1">The app text is in English for now. Choosing a language means we show professionals who speak it first, and the care team can call you in it.</p><div class="mt-3">' +
      LANGS.map(l => '<button class="radio-card' + (pt.hh().language === l ? ' on' : '') + '" data-act="acc.setlang" data-v="' + l + '"><span class="rd"></span><span class="grow"><b>' + l + '</b></span></button>').join('') + '</div>', { label: 'Language' });
  });
  BV.act('acc.setlang', v => { BV.Store.update(s => { s.households.find(h => h.id === pt.hh().id).language = v; }); BV.UI.closeSheet(); BV.UI.toast('Language: ' + v); });
  BV.act('acc.large', () => { const on = BV.ls.get('bv3.text') !== 'large'; BV.ls.set('bv3.text', on ? 'large' : 'normal'); document.documentElement.dataset.text = on ? 'large' : 'normal'; BV.Router.refresh(); });
  BV.act('acc.help', () => BV.UI.sheet('<h2>Help and contact</h2><div class="stack mt-3">' + C.callBtn('Call the care team', 'primary block') + '<button class="btn secondary block" data-act="acc.faq">Common questions</button></div><div class="callout warn mt-3">' + I('alert', 'sm') + '<span><b>Emergency?</b>Call ' + BV.config.emergencyNumber + '. Do not wait for a booking.</span></div>', { label: 'Help' }));
  BV.act('acc.faq', () => BV.UI.sheet('<h2>Common questions</h2>' + [
    ['What is the difference between BUSHEMI Care and an independent professional?', 'BUSHEMI Care means we choose, schedule and manage the professional for you at one all-inclusive price. With an independent professional you choose them yourself, they set their rate, and BUSHEMI verifies them and holds your payment until they accept.'],
    ['When am I charged?', 'In the live product, payment is held when you book and only collected once the visit is confirmed or done. If a request is declined or ignored, the hold is released.'],
    ['Can I cancel?', 'Yes. It is free until a few hours before the visit. The exact time is shown before you confirm.'],
    ['What if the signal is poor?', 'Use SMS reminders, ask for a voice call instead of video, or call the care team to book by phone.']
  ].map(x => '<div class="card flat mt-3"><b>' + esc(x[0]) + '</b><p class="muted mt-1">' + esc(x[1]) + '</p></div>').join(''), { label: 'FAQ', tall: true }));
  BV.act('acc.privacy', () => BV.UI.sheet('<h2>Privacy and your data</h2><div class="stack mt-3"><div class="card flat"><b>What we keep</b><p class="muted small mt-1">Your name and number, the people you care for, their health notes, medicines, readings, bookings, messages and visit summaries.</p></div><div class="card flat"><b>Who can see it</b><p class="muted small mt-1">You and the family you invite. A professional sees a person\'s health summary only after accepting a booking, and only if you chose to share.</p></div></div>' +
    '<button class="btn secondary block mt-3" data-act="acc.export">' + I('upload', 'sm') + 'Download my data</button><button class="btn danger-o block mt-2" data-act="acc.delete">Delete my account</button>' + C.simNote('This prototype was designed with data-protection principles in mind. A live launch needs a legal review against Zambia\'s Data Protection Act.'), { label: 'Privacy', tall: true }));
  BV.act('acc.export', () => {
    const s = BV.state(), id = pt.hh().id;
    const data = { exportedAt: new Date().toISOString(), household: s.households.find(h => h.id === id), people: s.recipients.filter(r => r.household === id), addresses: s.addresses.filter(a => a.household === id), bookings: s.bookings.filter(b => b.household === id), messages: s.messages.filter(m => s.bookings.some(b => b.id === m.b && b.household === id)) };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'bushemi-my-data.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      BV.UI.toast('Your data was downloaded');
    } catch (e) { BV.UI.toast('Could not download. Try another browser.', 'err'); }
  });
  BV.act('acc.delete', () => BV.UI.confirm({ title: 'Delete your account?', text: 'This removes your family\'s bookings, messages and health notes from this prototype. It cannot be undone.', yes: 'Delete everything', tone: 'danger', onYes: () => {
    const id = pt.hh().id;
    BV.Store.update(s => { s.bookings = s.bookings.filter(b => b.household !== id); s.messages = s.messages.filter(m => s.bookings.some(b => b.id === m.b)); s.recipients = s.recipients.filter(r => r.household !== id); s.addresses = s.addresses.filter(a => a.household !== id); s.households = s.households.filter(h => h.id !== id); s.notifications = s.notifications.filter(n => !(n.to.role === 'patient' && n.to.id === id)); });
    S.clear(); BV.Router.go('/welcome', { replace: true }); BV.UI.toast('Account deleted');
  } }));
  BV.act('acc.signout', () => { S.clear(); D.clear(); BV.Router.go('/welcome', { replace: true }); });

  /* ============ PAYMENTS ============ */
  function payments() {
    const s = BV.state(), hh = pt.hh(), methods = hh.pay || [{ id: 'pm0', type: 'mtn', number: pt.user().phone, label: 'MTN Mobile Money' }];
    const bs = BV.booking.forHousehold(s, hh.id).filter(b => !['declined', 'expired'].includes(b.status)).reverse();
    const stateTone = { paid: 'ok', held: 'info', due: 'warn', pay_after: 'neutral', released: 'neutral', fee_charged: 'warn' };
    const html = C.topbar({ title: 'Payments', back: '/account' }) +
      '<div class="card" style="padding:4px 16px">' + methods.map(m => '<div class="list-row"><span class="ic-tile amber">' + I('wallet') + '</span><div class="grow"><b>' + esc(m.label) + '</b><small>' + esc(m.number) + '</small></div><button class="icon-btn plain" data-act="pm.del" data-v="' + m.id + '" aria-label="Remove ' + esc(m.label) + '">' + I('trash') + '</button></div>').join('') + '</div>' +
      '<button class="btn secondary block mt-3" data-act="pm.add">' + I('plus', 'sm') + 'Add a payment method</button>' +
      C.simNote('Prototype: payment methods are stored on this device only and no real charges happen.') +
      C.section('Receipts') + (bs.length ? '<div class="card" style="padding:4px 16px">' + bs.map(b => '<button class="list-row" data-act="nav" data-v="/booking/' + b.id + (b.status === 'completed' ? '/receipt' : '') + '"><span class="ic-tile">' + I('receipt') + '</span><span class="grow"><b>' + esc(BV.svc(b.service).name) + '</b><small>' + esc(U.relDay(b.date)) + ' · ' + esc(C.paymentLabel(b).split(' (')[0]) + '</small></span><span style="text-align:right"><b>' + U.money(b.price.total) + '</b><br><span class="badge ' + (stateTone[b.payment.state] || 'neutral') + '">' + esc(b.payment.state.replace('_', ' ')) + '</span></span></button>').join('') + '</div>' : C.empty('receipt', 'No payments yet', 'Receipts will appear after you book.'));
    return { html, tab: null, title: 'Payments' };
  }
  BV.act('pm.add', () => {
    const t = D.get('pm.type', 'mtn'), err = D.get('pm_err', {});
    BV.UI.sheet('<h2>Add a payment method</h2><div class="mt-3">' + C.choice([['mtn', 'MTN'], ['airtel', 'Airtel'], ['zamtel', 'Zamtel']], t, 'pm.type') + '</div><div class="mt-3">' + C.input({ id: 'pm-num', label: 'Mobile money number', draft: 'pm.num', inputmode: 'tel', err: err.num }) + '</div><button class="btn primary block" data-act="pm.save">Save</button>', { label: 'Add payment method', onClose: () => { D.clear('pm'); D.clear('pm_err'); } });
  });
  BV.act('pm.type', v => { D.set('pm.type', v); BV.acts['pm.add'](); });
  BV.act('pm.save', () => {
    const p = D.get('pm', {}), n = String(p.num || '').replace(/\D/g, '').replace(/^260/, '').replace(/^0/, '');
    if (!/^9\d{8}$/.test(n)) { D.set('pm_err', { num: 'Enter a valid Zambian mobile number' }); BV.acts['pm.add'](); return; }
    const type = p.type || 'mtn', label = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', zamtel: 'Zamtel Kwacha' }[type];
    const cur = (pt.hh().pay || [{ id: 'pm0', type: 'mtn', number: pt.user().phone, label: 'MTN Mobile Money' }]).slice(); cur.push({ id: U.uid('pm'), type, number: '0' + n, label });
    BV.Store.update(s => { s.households.find(h => h.id === pt.hh().id).pay = cur; }); D.clear('pm'); D.clear('pm_err'); BV.UI.closeSheet(); BV.UI.toast('Payment method added');
  });
  BV.act('pm.del', v => { const cur = (pt.hh().pay || [{ id: 'pm0', type: 'mtn', number: pt.user().phone, label: 'MTN Mobile Money' }]).filter(m => m.id !== v); BV.Store.update(s => { s.households.find(h => h.id === pt.hh().id).pay = cur; }); });

  /* ============ TRUST ============ */
  function trust() {
    const fee = BV.config.fees.independentServicePct;
    const rows = [['Who chooses the professional', 'BUSHEMI', 'You'], ['Price', 'One all-inclusive price', 'Their rate + ' + fee + '% BUSHEMI fee'], ['Who accepts', 'BUSHEMI assigns', 'The professional accepts or declines'], ['If they cannot come', 'We arrange a replacement', 'Payment hold released; we suggest alternatives'], ['Visit report', 'Reviewed by BUSHEMI\'s clinical lead', 'The professional\'s own record'], ['Verification', 'Plus interview and skills assessment', 'Identity, qualifications, registration, police clearance, references']];
    const html = C.topbar({ title: 'Why trust BUSHEMI', back: '/account' }) +
      '<p class="muted">Care at home needs trust. Here is exactly how we earn it.</p>' +
      C.section('Every professional is checked') + '<div class="card"><div class="verify-list">' + Object.keys(BV.verify.CHECK_LABELS).map(k => '<div class="verify-item">' + I('shieldcheck') + '<div><b>' + esc(BV.verify.CHECK_LABELS[k][0]) + '</b><small>' + esc(BV.verify.CHECK_LABELS[k][1]) + '</small></div></div>').join('') + '</div><p class="muted small mt-3">Independent professionals complete identity, qualification, regulator registration, police clearance and references. BUSHEMI Care Team members also complete an interview and skills assessment. We re-check documents before they expire.</p></div>' +
      C.section('Two ways to get care, side by side') + '<div class="card" style="padding:6px 8px;overflow-x:auto"><table class="cmp-table"><thead><tr><th></th><th>' + C.badgeModel('managed', true) + '</th><th>' + C.badgeModel('independent', true) + '</th></tr></thead><tbody>' + rows.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table></div>' +
      C.section('Your money is protected') + '<div class="card">' + C.modelFacts('independent') + '</div>' +
      C.section('Honest reviews') + '<div class="card flat"><p>Only families who completed a booked visit can leave a review. Reviews are never edited or removed by professionals. Private feedback goes to BUSHEMI.</p></div>' +
      C.section('Your health information') + '<div class="card flat"><p>You decide what a professional sees, and only after they accept. You can download or delete your data any time.</p></div>' +
      C.section('What BUSHEMI is not') + '<div class="callout warn"><span>' + I('alert', 'sm') + '</span><span><b>Not for emergencies.</b>Call ' + BV.config.emergencyNumber + ' or go to the nearest hospital. BUSHEMI visits are planned care.</span></div>' +
      '<p class="sim-note">' + I('info', 'sm') + '<span>This is a prototype. Verification, payments and messages shown here are simulated demonstrations of how the live product will work.</span></p>';
    return { html, tab: null, title: 'Trust' };
  }

  BV.proute('/account', account);
  BV.proute('/payments', payments);
  BV.route('/trust', trust);
})(window.BV);
