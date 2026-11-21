/* BUSHEMI v3 · pro/me.js
   The "Me" area of the professional app: hub, profile, verification, earnings, reviews, settings. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pr = BV.pr, D = BV.Draft, S = BV.Session;
  const setMe = fn => BV.Store.update(s => { fn(s.pros.find(p => p.id === pr.me().id)); });
  const row = (ic, tone, label, sub, act, v, right) => '<button class="list-row" data-act="' + act + '"' + (v ? ' data-v="' + v + '"' : '') + '><span class="ic-tile ' + tone + '">' + I(ic) + '</span><span class="grow"><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + (right || '') + I('chev', 'chev') + '</button>';
  const type = p => BV.data.proTypes[p.type];

  /* ================= ME HUB ================= */
  function me() {
    const p = pr.me(), v = BV.verify.summary(p), e = pr.earnings(), rt = BV.rules.rating(p), managed = pr.managed();
    const html = '<div class="pro-head"><div class="top"><div class="row" style="gap:14px">' + U.avatar(p.name, 56) + '<div><h1 style="font-size:1.25rem">' + esc(p.name) + '</h1><small>' + esc(p.title) + '</small></div></div></div>' +
      '<div class="mt-3">' + C.badgeModel(p.model) + '</div></div>' +
      '<div class="kpis"><div class="kpi"><b>' + (rt.count ? rt.rating.toFixed(1) : '–') + '</b><span>rating</span></div><div class="kpi"><b>' + (p.stats.visits + pr.mine().filter(b => b.status === 'completed').length) + '</b><span>visits</span></div><div class="kpi"><b>' + U.money(managed ? e.accrued : e.available) + '</b><span>' + (managed ? 'accrued' : 'available') + '</span></div></div>' +
      '<div class="card list mt-3">' +
      row('shieldcheck', v.tone === 'ok' ? 'green' : v.tone === 'err' ? 'red' : 'amber', 'Verification', esc(v.label) + ' · ' + v.passed + ' of ' + v.total + ' checks', 'nav', '/verification') +
      row('wallet', 'amber', managed ? 'Pay and statements' : 'Earnings and payouts', managed ? 'Paid monthly by BUSHEMI' : U.money(e.available) + ' ready to pay out', 'nav', '/earnings') +
      row('user', 'blue', 'My profile', managed ? 'What patients see about you' : 'Bio, services, rates and areas', 'nav', '/profile') +
      row('cal', 'indigo', 'Availability', p.availability.online ? 'Online' : 'Paused', 'nav', '/availability') +
      row('star', 'amber', 'Reviews', rt.count + ' ' + U.plural(rt.count, 'review'), 'nav', '/reviews') +
      row('gear', '', 'Settings', 'Notifications, language, text size', 'nav', '/settings') + '</div>' +
      '<p class="muted small center mt-4">Prototype · demo data · <button class="link" data-act="demo.open">Demo tools</button></p>';
    return { html, tab: 'me', title: 'Me' };
  }

  /* ================= PROFILE ================= */
  function profile() {
    const p = pr.me(), t = type(p), managed = pr.managed();
    const g = (k, def) => D.get('pf.' + k, def);
    const langs = g('langs', p.languages), specs = g('specs', p.specialties), areas = managed ? p.areas : g('areas', p.areas);
    const catalogue = BV.data.services.filter(s => s.proType === p.type && !s.managedOnly);
    const svcs = g('svcs', p.services);
    const fee = BV.config.fees.independentServicePct;
    const svcRows = managed ? '<p class="muted small">Your visits and pay are set by BUSHEMI. Patients are charged the all-inclusive BUSHEMI price.</p>' :
      catalogue.map(s => {
        const cur = svcs.find(x => x.id === s.id), on = !!cur, rate = on ? cur.rate : s.rateRange[0], lo = s.rateRange[0], hi = s.rateRange[1], bad = on && (rate < lo || rate > hi);
        return '<div class="card flat mt-2"><div class="between"><b>' + esc(s.name) + '</b><button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="Offer ' + esc(s.name) + '" data-act="pf.svc" data-v="' + s.id + '"><i></i></button></div>' +
          (on ? '<div class="field mt-2' + (bad ? ' has-err' : '') + '"><label for="rate-' + s.id + '">Your rate (K)</label><input class="input" id="rate-' + s.id + '" inputmode="numeric" value="' + rate + '" data-on-input="pf.rate" data-s="' + s.id + '"><small class="muted">Suggested range K' + lo + ' to K' + hi + '</small>' + (bad ? '<small class="err-text" role="alert">Outside the suggested range</small>' : '') + '</div>' +
            '<div class="priv" style="margin-top:8px">' + I('eye', 'sm') + '<span>Patients will see <b>' + U.money(rate + Math.round(rate * fee / 100)) + '</b> (your rate + ' + fee + '% BUSHEMI service fee). You receive <b>' + U.money(Math.round(rate * (1 - BV.config.fees.proCommissionPct / 100))) + '</b>.</span></div>' : '') + '</div>';
      }).join('');
    const html = C.topbar({ title: 'My profile', back: '/me' }) +
      C.textarea({ id: 'pf-bio', label: 'About you', draft: 'pf.bio', rows: 4, hint: 'Patients read this first. Plain words work best.' }) +
      '<div class="lab mt-3">Languages</div>' + C.multi(['English', 'Bemba', 'Nyanja', 'Tonga', 'Lozi'], langs, 'pf.lang') +
      '<div class="lab mt-4">Specialties</div>' + C.multi(Array.from(new Set(['Wound care', 'Elderly care', 'Post-surgery recovery', 'Diabetes care', 'Blood pressure', 'Medication support', 'Family medicine', 'Stroke recovery', 'After surgery', 'Child care'].concat(p.specialties))), specs, 'pf.spec') +
      '<div class="lab mt-4">' + (managed ? 'Areas you cover' : 'Areas you travel to') + '</div>' +
      (managed ? '<div class="chips">' + areas.map(a => '<span class="chip on">' + esc(a) + '</span>').join('') + '</div><p class="muted small mt-2">The care team sets your areas. Ask them if you move.</p>' : C.multi(BV.data.areas, areas, 'pf.area')) +
      '<div class="lab mt-4">' + (managed ? 'Services' : 'Services and rates') + '</div>' + svcRows +
      '<div class="priv mt-4">' + I('eye', 'sm') + '<span>Your phone number and registration number are never shown to patients. Patients see your name, photo, verification status, languages, rating and reviews.</span></div>' +
      '<div class="book-bar"><button class="btn primary block" data-act="pf.save">Save profile</button></div>';
    return { html, tab: 'me', cls: 'hasbar', title: 'Profile', onMount() { if (D.get('pf.bio') === undefined) D.set('pf.bio', p.bio); } };
  }
  const draftInit = () => { const p = pr.me(); ['bio:bio', 'langs:languages', 'specs:specialties', 'areas:areas', 'svcs:services'].forEach(x => { const [k, f] = x.split(':'); if (D.get('pf.' + k) === undefined) D.set('pf.' + k, U.clone(p[f])); }); };
  BV.pr.profileInit = draftInit;
  const tog = (key, v, base) => { const a = D.get('pf.' + key, base).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); D.set('pf.' + key, a); BV.Router.refresh(); };
  BV.act('pf.lang', v => tog('langs', v, pr.me().languages));
  BV.act('pf.spec', v => tog('specs', v, pr.me().specialties));
  BV.act('pf.area', v => tog('areas', v, pr.me().areas));
  BV.act('pf.svc', v => {
    const a = U.clone(D.get('pf.svcs', pr.me().services)), i = a.findIndex(x => x.id === v);
    if (i > -1) a.splice(i, 1); else a.push({ id: v, rate: BV.svc(v).rateRange[0] });
    D.set('pf.svcs', a); BV.Router.refresh();
  });
  BV.act('pf.rate', (v, el) => { const a = U.clone(D.get('pf.svcs', pr.me().services)), x = a.find(y => y.id === el.dataset.s); if (x) { x.rate = parseInt(v, 10) || 0; D.set('pf.svcs', a); } });
  BV.act('pf.save', () => {
    const bio = (D.get('pf.bio', pr.me().bio) || '').trim(), langs = D.get('pf.langs', pr.me().languages), svcs = D.get('pf.svcs', pr.me().services), areas = D.get('pf.areas', pr.me().areas), managed = pr.managed();
    if (bio.length < 30) { BV.UI.toast('Please write a little more about yourself'); return; }
    if (!langs.length) { BV.UI.toast('Choose at least one language'); return; }
    if (!managed) {
      if (!svcs.length) { BV.UI.toast('Offer at least one service'); return; }
      if (svcs.some(x => !(x.rate > 0))) { BV.UI.toast('Enter a rate for each service'); return; }
      if (!areas.length) { BV.UI.toast('Choose at least one area'); return; }
    }
    setMe(p => { p.bio = bio; p.languages = langs; p.specialties = D.get('pf.specs', p.specialties); if (!managed) { p.services = svcs; p.areas = areas; } });
    D.clear('pf'); BV.UI.toast('Profile saved'); BV.Router.go('/me', { replace: true });
  });

  /* ================= VERIFICATION ================= */
  function verification() {
    const p = pr.me(), v = BV.verify.summary(p), ids = BV.verify.checksFor(p), isNew = (BV.Router.cur.query || {}).new === '1';
    const tone = { passed: 'ok', in_review: 'warn', pending: 'warn', needs_action: 'err' };
    const lab = { passed: 'Passed', in_review: 'In review', pending: 'In review', needs_action: 'Needs action' };
    const steps = ids.map(id => {
      const c = p.verification.checks[id] || { status: 'pending' }, l = BV.verify.label(p, id), left = c.expires ? Math.round((c.expires - Date.now()) / 86400000) : null;
      return '<div class="verify-step ' + (c.status === 'passed' ? 'done' : '') + '"><span class="vs-ic">' + I(c.status === 'passed' ? 'check' : c.status === 'needs_action' ? 'alert' : 'clock', 'sm') + '</span><div class="grow"><b>' + esc(l[0]) + '</b><small>' + esc(l[1]) + '</small>' +
        (c.status === 'passed' && c.date ? '<small>Checked ' + U.relDay(U.dkey(new Date(c.date))) + (c.number ? ' · ' + esc(c.number) : '') + (left !== null ? ' · expires in ' + left + ' days' : '') + '</small>' : '') +
        (c.note ? '<small class="err-text">' + esc(c.note) + '</small>' : '') +
        (c.status === 'needs_action' ? '<button class="btn sm primary mt-2" data-act="ver.reupload" data-v="' + id + '">' + I('upload', 'sm') + 'Upload again</button>' : '') +
        (c.status === 'passed' && left !== null && left < 60 ? '<button class="btn sm secondary mt-2" data-act="ver.renew" data-v="' + id + '">Renew now</button>' : '') + '</div>' +
        '<span class="badge ' + (tone[c.status] || 'neutral') + '">' + (lab[c.status] || 'Waiting') + '</span></div>';
    }).join('');
    const banner = isNew ? '<div class="callout ok">' + I('check', 'sm') + '<span><b>Application received</b>BUSHEMI is checking your documents. This usually takes 2 to 5 working days. We will notify you here and by SMS.</span></div>' : '';
    const live = v.status === 'verified' ? '<div class="callout ok">' + I('shieldcheck', 'sm') + '<span><b>You are verified and visible to patients</b>' + (pr.managed() ? 'The care team can assign you visits.' : 'Patients can find you and send requests.') + '</span></div>'
      : v.status === 'suspended' ? '<div class="callout warn">' + I('alert', 'sm') + '<span><b>Your bookings are paused</b>BUSHEMI is reviewing a concern. The care team will contact you.</span></div>'
      : '<div class="callout warn">' + I('clock', 'sm') + '<span><b>Not visible to patients yet</b>Patients only see professionals whose checks have all passed. This protects them and you.</span></div>';
    const html = C.topbar({ title: 'Verification', back: '/me', sub: v.passed + ' of ' + v.total + ' checks passed' }) + banner + live +
      '<div class="card mt-3">' + steps + '</div>' +
      C.simNote('Prototype: documents are not uploaded or checked. In the real service BUSHEMI staff verify each item and the regulator register is checked by a person.') +
      '<div class="card flat mt-3"><b>Why we check</b><p class="small muted mt-1">Families let you into their homes and into the care of someone they love. Every professional, independent or on the BUSHEMI Care Team, passes the same identity, qualification, regulator, police and reference checks.' + (pr.managed() ? ' Care Team members also complete an interview and a practical assessment.' : '') + '</p></div>';
    return { html, tab: 'me', title: 'Verification' };
  }
  BV.act('ver.reupload', v => {
    setMe(p => { p.verification.checks[v] = { status: 'in_review', date: Date.now() }; if (!Object.values(p.verification.checks).some(c => c.status === 'needs_action') && p.verification.status === 'action_needed') p.verification.status = 'in_review'; });
    BV.UI.toast('Sent for checking');
  });
  BV.act('ver.renew', v => BV.UI.sheet('<h2>Renew this document</h2><p class="muted small mt-1">Upload the new certificate. You stay visible while BUSHEMI checks it, until the old one expires.</p>' +
    '<label class="upload mt-3">' + I('upload') + '<span>Choose a photo or PDF</span><input type="file" accept="image/*,application/pdf" data-on-input="ver.file" hidden></label><p class="muted small mt-2" id="ver-file">Nothing chosen yet</p>' +
    '<button class="btn primary block mt-4" data-act="ver.renewgo" data-v="' + v + '">Send for checking</button>', { label: 'Renew' }));
  BV.act('ver.file', (val, el) => { const f = el.files && el.files[0], t = document.getElementById('ver-file'); if (f && t) t.textContent = f.name; });
  BV.act('ver.renewgo', v => { setMe(p => { p.verification.checks[v].renewal = 'in_review'; }); BV.UI.closeSheet(); BV.UI.toast('Renewal sent. You stay visible meanwhile.'); });

  /* ================= EARNINGS ================= */
  function earnings() {
    const p = pr.me(), e = pr.earnings(), managed = pr.managed(), s = BV.state(), pays = s.payouts.filter(x => x.pro === p.id).sort((a, b) => b.ts - a.ts);
    const days = [], today = U.today();
    for (let i = 6; i >= 0; i--) { const d = U.addDays(today, -i), k = U.dkey(d), sum = U.sum(e.ledger.filter(l => U.dkey(new Date(l.ts)) === k).map(l => l.amount)); days.push({ l: U.WD[U.wdIndex(d)], v: sum }); }
    const mx = Math.max.apply(null, days.map(d => d.v).concat([1]));
    const bars = '<div class="week-bars" role="img" aria-label="Earnings for the last 7 days">' + days.map(d => '<div class="wb"><i style="height:' + Math.max(4, Math.round(d.v / mx * 70)) + 'px' + (d.v ? '' : ';opacity:.25') + '"></i><small>' + d.l.slice(0, 1) + '</small></div>').join('') + '</div>';
    const st = { available: ['Available', 'ok'], accrued: ['This month\'s pay', 'info'], paid_out: ['Paid', 'neutral'] };
    const ledger = e.ledger.length ? e.ledger.slice(0, 20).map(l => '<div class="ledger-row"><div class="grow"><b>' + esc(l.desc) + '</b><small>' + U.relDay(U.dkey(new Date(l.ts))) + '</small></div><div class="right"><b>' + U.money(l.amount) + '</b><span class="badge ' + st[l.status][1] + '">' + st[l.status][0] + '</span></div></div>').join('') : C.empty('wallet', 'No earnings yet', 'Completed visits appear here once you submit the visit report.');
    const bal = managed ?
      '<div class="balance"><small>Accrued this month</small><div class="amt">' + U.money(e.accrued) + '</div><p>BUSHEMI pays Care Team members monthly through payroll. Per-visit pay is fixed and shown on every assignment.</p></div>' :
      '<div class="balance"><small>Available to pay out</small><div class="amt">' + U.money(e.available) + '</div><button class="btn block" data-act="earn.pay"' + (e.available < BV.config.minPayout ? ' aria-disabled="true"' : '') + '>' + I('wallet', 'sm') + 'Pay out to mobile money</button>' +
      (e.available < BV.config.minPayout ? '<p>Minimum payout is ' + U.money(BV.config.minPayout) + '.</p>' : '<p>Money from completed visits. Sent to your mobile money wallet.</p>') + '</div>';
    const html = C.topbar({ title: managed ? 'Pay and statements' : 'Earnings', back: '/me' }) + bal +
      '<div class="grid2 mt-3">' + C.stat(U.money(e.week), 'last 7 days') + C.stat(U.money(e.month), 'this month') + '</div>' +
      '<div class="card mt-3"><b>Last 7 days</b>' + bars + '</div>' +
      (!managed ? '<div class="callout info mt-3">' + I('info', 'sm') + '<span><b>How your pay is worked out</b>' + (BV.config.fees.proCommissionPct ? 'You earn your rate minus BUSHEMI\'s ' + BV.config.fees.proCommissionPct + '% commission. ' : 'You earn your full rate. ') + 'The patient pays a ' + BV.config.fees.independentServicePct + '% service fee on top, which is not taken from you.</span></div>' : '') +
      BV.comp.section('Activity') + '<div class="card">' + ledger + '</div>' +
      (pays.length ? BV.comp.section('Payouts') + '<div class="card">' + pays.map(x => '<div class="ledger-row"><div class="grow"><b>' + esc(x.method) + '</b><small>' + esc(x.number) + ' · ' + U.relDay(U.dkey(new Date(x.ts))) + '</small></div><div class="right"><b>' + U.money(x.amount) + '</b><span class="badge neutral">Sent</span></div></div>').join('') + '</div>' : '') +
      C.simNote('Prototype: no money moves. Payouts are simulated.');
    return { html, tab: 'me', title: 'Earnings' };
  }
  BV.act('earn.pay', () => {
    const e = pr.earnings(), p = pr.me();
    if (e.available < BV.config.minPayout) { BV.UI.toast('Minimum payout is ' + U.money(BV.config.minPayout)); return; }
    const m = D.get('po.m', 'MTN Mobile Money'), n = D.get('po.n', p.phone.replace(/^\+260\s?/, '0'));
    BV.UI.sheet('<h2>Pay out ' + U.money(e.available) + '</h2><div class="lab mt-3">Send to</div>' + C.choice(['MTN Mobile Money', 'Airtel Money', 'Zamtel Money'], m, 'earn.m') +
      '<div class="field mt-3"><label for="po-n">Mobile money number</label><input class="input" id="po-n" inputmode="tel" value="' + esc(n) + '" data-draft="po.n"></div>' +
      '<button class="btn primary block mt-4" data-act="earn.go">Confirm payout</button>' + C.simNote('Simulated. No real money is sent.'), { label: 'Payout' });
  });
  BV.act('earn.m', v => { D.set('po.m', v); BV.acts['earn.pay'](); });
  BV.act('earn.go', () => {
    const n = (D.get('po.n', '') || '').replace(/\s/g, '');
    if (!/^0\d{9}$/.test(n)) { BV.UI.toast('Enter a 10 digit number starting with 0'); return; }
    const amt = BV.booking.requestPayout(pr.me().id, D.get('po.m', 'MTN Mobile Money'), n);
    D.clear('po'); BV.UI.closeSheet(); BV.UI.toast(amt ? U.money(amt) + ' is on its way (simulated)' : 'Nothing to pay out');
  });

  /* ================= REVIEWS ================= */
  function reviews() {
    const p = pr.me(), rt = BV.rules.rating(p), list = BV.rules.reviewList(p);
    const html = C.topbar({ title: 'Reviews', back: '/me' }) +
      '<div class="card center"><b style="font-size:2rem">' + (rt.count ? rt.rating.toFixed(1) : '–') + '</b><div>' + C.stars(rt.rating) + '</div><p class="muted small">' + rt.count + ' ' + U.plural(rt.count, 'review') + ' · ' + p.stats.visits + ' visits</p></div>' +
      '<div class="stack mt-3">' + list.map(r => '<article class="card"><div class="between"><b>' + esc(r.name) + '</b>' + C.stars(r.rating) + '</div><p class="mt-1">' + esc(r.text) + '</p>' + ((r.tags || []).length ? '<div class="chips mt-2">' + r.tags.map(t => '<span class="chip on">' + esc(t) + '</span>').join('') + '</div>' : '') + '<small class="muted">' + U.relDay(U.dkey(new Date(r.ts))) + (r.fresh ? '' : ' · illustrative') + '</small></article>').join('') + '</div>' +
      C.simNote('Older reviews are illustrative demo content. New reviews come from patients who completed a visit with you.');
    return { html, tab: 'me', title: 'Reviews' };
  }

  /* ================= SETTINGS ================= */
  const PREF = { push: ['App notifications', 'New requests, changes and messages'], sms: ['SMS alerts', 'Works without data'], wa: ['WhatsApp alerts', 'Requests and reminders on WhatsApp'], remind: ['Visit reminders', 'An hour before each visit'] };
  const prefs = () => Object.assign({ push: true, sms: true, wa: false, remind: true }, pr.me().prefs || {});
  function settings() {
    const p = pr.me(), pf = prefs(), large = BV.ls.get('bv3.text') === 'large';
    const html = C.topbar({ title: 'Settings', back: '/me' }) +
      '<div class="card">' + Object.keys(PREF).map(k => C.toggle({ label: PREF[k][0], sub: PREF[k][1], on: pf[k], act: 'set.pref', v: k })).join('') + '</div>' +
      '<div class="card mt-3">' + C.toggle({ label: 'Larger text', sub: 'Easier to read in daylight', on: large, act: 'set.large' }) + '</div>' +
      '<div class="card mt-3"><div class="kv"><span>Phone</span><b>' + esc(p.phone) + '</b></div><div class="kv"><span>Model</span><b>' + (pr.managed() ? 'BUSHEMI Care Team' : 'Independent') + '</b></div></div>' +
      '<div class="stack mt-4"><button class="btn secondary block" data-act="set.help">Help and contact</button><button class="btn secondary block" data-act="set.out">Sign out</button></div>' +
      '<p class="muted small center mt-4">BUSHEMI v3 prototype</p>';
    return { html, tab: 'me', title: 'Settings' };
  }
  BV.act('set.pref', v => { const pf = prefs(); pf[v] = !pf[v]; setMe(p => { p.prefs = pf; }); });
  BV.act('set.large', () => { const on = BV.ls.get('bv3.text') !== 'large'; BV.ls.set('bv3.text', on ? 'large' : 'normal'); document.documentElement.dataset.text = on ? 'large' : 'normal'; BV.Router.refresh(); });
  BV.act('set.help', () => BV.UI.sheet('<h2>Help and contact</h2><div class="stack mt-3">' + C.callBtn('Call BUSHEMI support', 'primary block') + '</div><div class="callout warn mt-3">' + I('alert', 'sm') + '<span><b>Emergency at a visit?</b>Call ' + BV.config.emergencyNumber + ' first, then tell BUSHEMI.</span></div>', { label: 'Help' }));
  BV.act('set.out', () => BV.UI.confirm({ title: 'Sign out?', text: 'Your profile and visits stay saved.', yes: 'Sign out', onYes: () => { S.clear(); D.clear(); D._d = null; BV.Router.go('/welcome', { replace: true }); } }));

  /* ---------- verification route wrapper ensures profile draft initialises ---------- */
  const profileRoute = ctx => { draftInit(); return profile(ctx); };
  BV.prroute('/me', me);
  BV.prroute('/profile', profileRoute);
  BV.prroute('/verification', verification);
  BV.prroute('/earnings', earnings);
  BV.prroute('/reviews', reviews);
  BV.prroute('/settings', settings);
})(window.BV);
