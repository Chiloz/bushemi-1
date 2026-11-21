/* BUSHEMI v3 · patient/onboarding.js
   Welcome, create account / sign in, one-time code, and first set-up.
   The one-time code is simulated and shown on screen, clearly labelled. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pt = BV.pt, D = BV.Draft, S = BV.Session;

  const ART = [
    '<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="112" r="92" fill="#E8EEFD"/><path d="M52 118l58-46 58 46v52a6 6 0 0 1-6 6H58a6 6 0 0 1-6-6z" fill="#fff" stroke="#2557E8" stroke-width="4" stroke-linejoin="round"/><path d="M110 100v40M90 120h40" stroke="#1B7F2A" stroke-width="10" stroke-linecap="round"/><circle cx="164" cy="64" r="20" fill="#1B7F2A"/><path d="M155 64l7 7 12-13" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="112" r="92" fill="#F1EEFD"/><rect x="26" y="70" width="80" height="96" rx="18" fill="#E3F3E6" stroke="#1B7F2A" stroke-width="4"/><rect x="114" y="70" width="80" height="96" rx="18" fill="#fff" stroke="#5B3FC4" stroke-width="4"/><circle cx="66" cy="102" r="14" fill="#1B7F2A"/><path d="M42 148c2-14 12-20 24-20s22 6 24 20" fill="#1B7F2A"/><circle cx="154" cy="102" r="14" fill="#5B3FC4"/><path d="M130 148c2-14 12-20 24-20s22 6 24 20" fill="#5B3FC4"/></svg>',
    '<svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="112" r="92" fill="#FFF0D3"/><rect x="72" y="36" width="76" height="148" rx="16" fill="#fff" stroke="#0E1A2B" stroke-width="4"/><rect x="84" y="62" width="52" height="30" rx="8" fill="#E8EEFD"/><rect x="84" y="100" width="52" height="12" rx="6" fill="#E3F3E6"/><rect x="84" y="120" width="36" height="12" rx="6" fill="#E3F3E6"/><circle cx="110" cy="158" r="9" fill="#2557E8"/><path d="M168 78a30 30 0 0 1 0 40M180 66a48 48 0 0 1 0 64" stroke="#1B7F2A" stroke-width="5" fill="none" stroke-linecap="round"/></svg>'
  ];
  const SLIDES = [
    ['Care at home, from people you can trust', 'Nurses, caregivers, midwives and therapists who come to you, or meet you on a call. Every professional is checked by BUSHEMI.'],
    ['Two ways to get care', 'Let BUSHEMI arrange and manage everything for you, or browse independent professionals and pick the one you like. You always see which is which.'],
    ['Made for how Zambia lives', 'Pay with MTN, Airtel or Zamtel money. Get reminders by SMS or WhatsApp. Works on slow connections, and you can always call us.']
  ];

  function welcome() {
    const i = D.get('ob.slide', 0), last = i === SLIDES.length - 1;
    const html = '<div class="auth" style="padding-top:20px"><div class="brand-lockup">' + C.MARK + 'BUSHEMI</div>' +
      '<div class="slide">' + ART[i] + '<h1>' + esc(SLIDES[i][0]) + '</h1><p>' + esc(SLIDES[i][1]) + '</p></div>' +
      '<div class="dots" aria-hidden="true">' + SLIDES.map((x, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<div class="stack">' + (last ? '<button class="btn primary block" data-act="nav" data-v="/auth?mode=new">Get started</button>' : '<button class="btn primary block" data-act="ob.next">Next</button>') +
      '<button class="btn secondary block" data-act="nav" data-v="/auth?mode=in">I already have an account</button></div>' +
      '<div class="divider">or</div><button class="btn ghost block" data-act="ob.demo">Try the demo family (Mutinta)</button>' +
      '<p class="muted small center mt-3">Prototype with demo data. <button class="link" data-act="demo.open">Demo tools</button></p></div>';
    return { html, tab: null, title: 'Welcome' };
  }
  BV.act('ob.next', () => { D.set('ob.slide', Math.min(SLIDES.length - 1, D.get('ob.slide', 0) + 1)); BV.Router.refresh(); });

  function signIn(hhId, userId) {
    S.set('household', hhId); S.set('user', userId); S.set('epoch', BV.state().epoch);
    const people = BV.state().recipients.filter(r => r.household === hhId);
    S.set('recipient', people[0] && people[0].id);
    const ad = BV.state().addresses.find(a => a.household === hhId); if (ad) S.set('area', ad.area);
    D.clear('auth'); D.clear('ob');
    BV.Router.go('/', { replace: true });
  }
  BV.act('ob.demo', () => signIn('h1', 'u1'));

  function auth(p) {
    const mode = p.query.mode === 'in' ? 'in' : 'new', err = D.get('auth_err', {});
    const html = C.topbar({ title: mode === 'new' ? 'Create your account' : 'Welcome back', back: '/welcome' }) +
      '<p class="muted">' + (mode === 'new' ? 'We use your phone number to keep your family\'s care records safe.' : 'Enter the phone number you registered with.') + '</p><div class="mt-4">' +
      (mode === 'new' ? C.input({ id: 'au-name', label: 'Your full name', draft: 'auth.name', autocomplete: 'name', err: err.name }) : '') +
      C.input({ id: 'au-phone', label: 'Mobile number', draft: 'auth.phone', prefix: '+260', inputmode: 'tel', autocomplete: 'tel', placeholder: '96 123 4567', err: err.phone, hint: 'We will send a one-time code' }) +
      (mode === 'new' ? '<label class="row" style="align-items:flex-start;margin:6px 0 14px"><input type="checkbox" id="au-consent" data-draft="auth.consent" ' + (D.get('auth.consent', false) ? 'checked' : '') + ' style="width:22px;height:22px;margin-top:2px;accent-color:var(--brand)"><span class="small">I agree to BUSHEMI\'s terms and understand how my health information is used and shared. <button class="link" data-act="nav" data-v="/trust" type="button">Read more</button></span></label>' + (err.consent ? '<small class="err-text" role="alert">' + err.consent + '</small>' : '') : '') +
      '</div><button class="btn primary block" data-act="auth.send" data-v="' + mode + '">Send code</button>' +
      '<div class="divider">or</div><button class="btn secondary block" data-act="ob.demo">Continue as the demo family (Mutinta)</button>' +
      '<p class="muted small mt-3">Demo numbers you can sign in with: 096 123 4567 (owner), 097 765 4321 (view-only member).</p>';
    return { html, tab: null, title: 'Account' };
  }
  const digits = x => String(x || '').replace(/\D/g, '').replace(/^260/, '').replace(/^0/, '');
  BV.act('auth.send', mode => {
    const a = D.get('auth', {}), err = {}, ph = digits(a.phone);
    if (mode === 'new' && !String(a.name || '').trim()) err.name = 'Please enter your name';
    if (!/^9\d{8}$/.test(ph)) err.phone = 'Enter a valid Zambian mobile number, like 96 123 4567';
    if (mode === 'new' && !a.consent) err.consent = 'Please agree to continue';
    if (!Object.keys(err).length) {
      const exists = BV.state().households.some(h => h.members.some(m => digits(m.phone) === ph));
      if (mode === 'in' && !exists) err.phone = 'No account with that number. Check it, or create a new account.';
      if (mode === 'new' && exists) err.phone = 'That number already has an account. Try signing in instead.';
    }
    D.set('auth_err', err);
    if (Object.keys(err).length) { BV.Router.refresh(); return; }
    D.set('auth.code', String(1000 + Math.floor(Math.random() * 9000))); D.set('auth.mode', mode); D.set('auth.sentAt', Date.now());
    BV.Net.call(() => 1).then(() => BV.Router.go('/otp')).catch(() => BV.UI.toast('No connection. Please try again.', 'err'));
    BV.UI.toast('Sending code…');
  });

  function otp() {
    const a = D.get('auth', {}); if (!a.code) return pt.redirect('/auth?mode=new');
    const err = D.get('otp_err', '');
    const html = C.topbar({ title: 'Enter the code', back: '/auth?mode=' + (a.mode || 'new') }) +
      '<p class="muted">We sent a 4-digit code to +260 ' + esc(a.phone) + '.</p>' +
      '<div class="callout warn mt-3">' + I('info', 'sm') + '<span><b>Prototype</b>No SMS is sent. Your demo code is <b style="display:inline;font-size:1.1rem;letter-spacing:.2em">' + esc(a.code) + '</b></span></div>' +
      '<div class="mt-4">' + C.input({ id: 'otp-in', label: 'Code', draft: 'auth.try', inputmode: 'numeric', max: 4, autocomplete: 'one-time-code', err }) + '</div>' +
      '<button class="btn primary block" data-act="otp.check">Verify</button>';
    return { html, tab: null, title: 'Verify' };
  }
  BV.act('otp.check', () => {
    const a = D.get('auth', {});
    if (String(a.try || '').trim() !== a.code) { D.set('otp_err', 'That code is not right. Check the demo code above.'); BV.Router.refresh(); return; }
    D.set('otp_err', '');
    const ph = digits(a.phone), s = BV.state();
    if (a.mode === 'in') {
      for (const h of s.households) { const m = h.members.find(x => digits(x.phone) === ph); if (m) { signIn(h.id, m.id); return; } }
      return;
    }
    const hid = U.uid('h'), uid = U.uid('u'), rid = U.uid('r'), name = String(a.name).trim();
    BV.Store.update(st => {
      st.households.push({ id: hid, name: U.firstName(name) + ' family', language: 'English', voucherUsed: false, prefs: { push: true, sms: true, wa: false, meds: true, visit: true }, members: [{ id: uid, name, phone: '0' + ph, role: 'owner', status: 'active' }] });
      st.recipients.push({ id: rid, household: hid, name, relation: 'Myself', age: 0, conditions: [], allergies: [], address: null, emergency: { name: '', phone: '' }, meds: [], vitals: { bp: [], sugar: [], weight: [] } });
    });
    S.set('household', hid); S.set('user', uid); S.set('epoch', BV.state().epoch); S.set('recipient', rid); D.clear('auth');
    BV.Router.go('/setup', { replace: true });
  });

  function setup() {
    if (!pt.hh()) return pt.redirect('/welcome');
    const who = D.get('setup.who', 'self'), err = D.get('setup_err', {});
    const html = C.topbar({ title: 'Set up your care', back: false }) + C.steps(0, ['Your care']) +
      '<h2 class="mt-3">Who needs care?</h2><div class="mt-2">' + [['self', 'Myself', 'user'], ['parent', 'A parent or older relative', 'users'], ['child', 'My child', 'baby'], ['other', 'Someone else', 'heart']].map(x =>
        '<button class="radio-card' + (who === x[0] ? ' on' : '') + '" role="radio" aria-checked="' + (who === x[0]) + '" data-act="setup.who" data-v="' + x[0] + '"><span class="rd"></span><span class="ic-tile">' + I(x[2]) + '</span><span class="grow"><b>' + x[1] + '</b></span></button>').join('') + '</div>' +
      '<div class="mt-3">' + (who !== 'self' ? C.input({ id: 'su-name', label: 'Their name', draft: 'setup.name', err: err.name }) : '') + C.input({ id: 'su-age', label: who === 'self' ? 'Your age' : 'Their age', draft: 'setup.age', type: 'number', inputmode: 'numeric', err: err.age }) + '</div>' +
      '<h2 class="mt-4">Which area are you in?</h2><p class="muted small">We show professionals who cover your area.</p><div class="chips mt-2">' + BV.data.areas.map(a => '<button class="chip' + (D.get('setup.area', 'Chalala') === a ? ' on' : '') + '" data-act="setup.area" data-v="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>' +
      '<button class="btn primary block mt-5" data-act="setup.done">Finish</button><button class="btn ghost block" data-act="setup.skip">Skip for now</button>';
    return { html, tab: null, title: 'Set up' };
  }
  BV.act('setup.who', v => { D.set('setup.who', v); BV.Router.refresh(); });
  BV.act('setup.area', v => { D.set('setup.area', v); BV.Router.refresh(); });
  BV.act('setup.skip', () => { S.set('area', D.get('setup.area', 'Chalala')); D.clear('setup'); BV.Router.go('/', { replace: true }); });
  BV.act('setup.done', () => {
    const who = D.get('setup.who', 'self'), n = D.get('setup', {}), err = {};
    if (who !== 'self' && !String(n.name || '').trim()) err.name = 'Enter their name';
    const a = parseInt(n.age, 10); if (!(a >= 0 && a <= 120)) err.age = 'Enter an age';
    D.set('setup_err', err); if (Object.keys(err).length) { BV.Router.refresh(); return; }
    S.set('area', D.get('setup.area', 'Chalala'));
    if (who === 'self') {
      const me = pt.cur(); BV.Store.update(s => { const r = s.recipients.find(x => x.id === me.id); if (r) r.age = a; });
    } else {
      const id = U.uid('r'), u = pt.user();
      BV.Store.update(s => s.recipients.push({ id, household: pt.hh().id, name: n.name.trim(), relation: who === 'parent' ? 'Parent' : who === 'child' ? 'Child' : 'Relative', age: parseInt(n.age, 10), conditions: [], allergies: [], address: null, emergency: { name: u.name, phone: u.phone }, meds: [], vitals: { bp: [], sugar: [], weight: [] } }));
      S.set('recipient', id);
    }
    D.clear('setup'); D.clear('setup_err'); BV.UI.toast('You are all set');
    BV.Router.go('/', { replace: true });
  });

  BV.route('/welcome', welcome);
  BV.route('/auth', auth);
  BV.route('/otp', otp);
  BV.route('/setup', setup);
})(window.BV);
