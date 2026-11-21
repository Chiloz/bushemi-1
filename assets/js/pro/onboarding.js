/* BUSHEMI v3 · pro/onboarding.js
   Welcome, demo sign-in, and the 6-step "Join BUSHEMI" wizard. Submitting creates a real profile in the
   shared state with verification "in review": it does NOT appear to patients until verified. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pr = BV.pr, D = BV.Draft, S = BV.Session;

  function signIn(id) {
    S.set('pro', id); S.set('epoch', BV.state().epoch); D.clear('join');
    BV.Router.go('/', { replace: true });
  }
  BV.act('pro.signin', v => signIn(v));
  BV.act('pro.demo', () => signIn('p_grace'));

  function welcome() {
    const s = BV.state(), created = s.pros.filter(p => p.created);
    const card = (p, sub, tone, ic) => '<button class="role-card" data-act="pro.signin" data-v="' + p.id + '"><span class="ic-tile ' + tone + '">' + I(ic) + '</span><span><b>' + esc(p.name) + '</b><small>' + sub + '</small></span>' + I('chev', 'chev') + '</button>';
    const html = '<div class="hero-wel"><div class="brand-lockup">' + C.MARK + 'BUSHEMI</div><h1>Care that fits your work</h1><p>Join the BUSHEMI Care Team or run your own practice on the BUSHEMI marketplace. Verified, supported, paid on time.</p></div>' +
      '<h2 class="mt-5">Try the professional app</h2><p class="muted small" style="margin-bottom:12px">Demo accounts. Open the patient app in another tab to watch bookings move between them.</p>' +
      card(s.pros.find(p => p.id === 'p_grace'), 'Independent nurse · receives requests, sets her own rates', 'blue', 'user') +
      card(s.pros.find(p => p.id === 'p_natasha'), 'BUSHEMI Care Team nurse · receives assignments', 'green', 'shieldcheck') +
      created.map(p => card(p, 'You joined · ' + esc(BV.verify.summary(p).label), 'amber', 'sparkle')).join('') +
      '<div class="divider">or</div><button class="btn primary block" data-act="nav" data-v="/join?step=0">Join BUSHEMI as a professional</button>' +
      '<div class="card flat mt-4"><b>Two ways to work with BUSHEMI</b><div class="mt-3 stack">' +
      '<div class="row" style="align-items:flex-start">' + C.badgeModel('managed', true) + '<span class="small muted">BUSHEMI assigns you visits and pays you per visit. Includes an interview and skills assessment.</span></div>' +
      '<div class="row" style="align-items:flex-start">' + C.badgeModel('independent', true) + '<span class="small muted">You set your rate and availability and accept the requests you want. A service fee is added on the patient\'s side.</span></div></div></div>' +
      '<p class="muted small center mt-3">Prototype with demo data. <button class="link" data-act="demo.open">Demo tools</button></p>';
    return { html, tab: null, title: 'Welcome' };
  }

  /* ================= JOIN WIZARD ================= */
  const STEPS = ['Account', 'Profession', 'Documents', 'Services', 'Availability', 'Review'];
  const T = BV.data.proTypes, TYPES = Object.keys(T);
  const jget = (p, d) => D.get('join.' + p, d);
  const homeSvcs = type => BV.data.services.filter(s => s.proType === type && s.rateRange[1] > 0);
  const phoneOk = x => /^9\d{8}$/.test(String(x || '').replace(/\D/g, '').replace(/^260/, '').replace(/^0/, ''));

  function reqDocs(type) { const d = [['identity', 'Identity', 'National Registration Card or passport'], ['qualification', type === 'caregiver' ? 'Training certificate' : 'Qualification', 'Your certificate or degree']]; if (T[type].regulator) d.push(['registration', T[type].regulator + ' registration', 'Current practising certificate']); d.push(['police', 'Police clearance', 'A recent clearance certificate']); return d; }

  function stepOk(step) {
    const j = D.get('join', {}), type = j.type;
    if (step === 0) return String(j.name || '').trim().length > 1 && phoneOk(j.phone) && !!j.consent ? '' : 'Enter your name and mobile number and agree to continue';
    if (step === 1) { if (!type) return 'Choose your profession'; if (!(parseInt(j.years, 10) >= 0 && parseInt(j.years, 10) <= 60 && j.years !== undefined && j.years !== '')) return 'Enter your years of experience'; if (!String(j.reg || '').trim()) return 'Enter your ' + T[type].licenceLabel.toLowerCase(); if (!(j.langs || []).length) return 'Choose at least one language'; return ''; }
    if (step === 2) { const miss = reqDocs(type).filter(d => !(j.docs || {})[d[0]]); if (miss.length) return 'Add: ' + miss.map(m => m[1]).join(', '); if (!String(j.ref1 || '').trim() || !String(j.ref2 || '').trim()) return 'Add two professional references'; return ''; }
    if (step === 3) { const on = homeSvcs(type).filter(s => ((j.svc || {})[s.id] || {}).on); if (!on.length) return 'Choose at least one service'; for (const s of on) { const r = parseInt((j.rates || {})[s.id], 10); if (!(r >= s.rateRange[0] && r <= s.rateRange[1])) return 'Set a rate for ' + s.name + ' between ' + U.money(s.rateRange[0]) + ' and ' + U.money(s.rateRange[1]); } return ''; }
    if (step === 4) { if (!(j.days || []).some(Boolean)) return 'Choose at least one working day'; if (!(j.shifts || []).length) return 'Choose at least one shift'; const needsArea = homeSvcs(type).some(s => ((j.svc || {})[s.id] || {}).on && s.mode === 'home'); if (needsArea && !(j.areas || []).length) return 'Choose at least one area you can travel to'; return ''; }
    return '';
  }

  function join(p) {
    const step = U.clamp(+p.query.step || 0, 0, 5), j = D.get('join', {}), type = j.type, why = stepOk(step), err = {};
    let body = '';
    if (step === 0) {
      body = '<h2>Create your professional account</h2><p class="muted small mt-1">It takes about 5 minutes. You can finish later: your answers are saved on this device.</p><div class="mt-4">' +
        C.input({ id: 'j-name', label: 'Full name as on your ID', draft: 'join.name', autocomplete: 'name' }) +
        C.input({ id: 'j-phone', label: 'Mobile number', draft: 'join.phone', prefix: '+260', inputmode: 'tel', autocomplete: 'tel', placeholder: '96 000 0000' }) +
        '<label class="row" style="align-items:flex-start"><input type="checkbox" data-draft="join.consent" ' + (j.consent ? 'checked' : '') + ' style="width:22px;height:22px;margin-top:2px;accent-color:var(--brand)"><span class="small">I agree to BUSHEMI\'s professional terms and consent to my documents being checked with the issuing bodies.</span></label></div>';
    }
    if (step === 1) {
      body = '<h2>Your profession</h2><div class="mt-3">' + TYPES.map(k => '<button class="radio-card' + (type === k ? ' on' : '') + '" role="radio" aria-checked="' + (type === k) + '" data-act="join.type" data-v="' + k + '"><span class="rd"></span><span class="grow"><b>' + T[k].label + '</b><small>' + (T[k].regulator ? 'Registered with ' + T[k].regulator : 'Certificate and reference checks') + '</small></span></button>').join('') + '</div>' +
        (type ? '<div class="mt-3">' + C.input({ id: 'j-years', label: 'Years of experience', draft: 'join.years', type: 'number', inputmode: 'numeric' }) + C.input({ id: 'j-reg', label: T[type].licenceLabel + (T[type].regulator ? ' (' + T[type].regulator + ')' : ''), draft: 'join.reg', placeholder: T[type].regulator ? 'As on your practising certificate' : 'As on your certificate' }) +
          '<div class="lab">Languages you can care in</div>' + C.multi(['English', 'Bemba', 'Nyanja', 'Tonga', 'Lozi'], j.langs || [], 'join.lang') + '<div class="mt-3"></div>' +
          C.input({ id: 'j-spec', label: 'Specialisations', draft: 'join.spec', opt: true, placeholder: 'e.g. wound care, elderly care', hint: 'Separate with commas' }) +
          C.textarea({ id: 'j-bio', label: 'About you', draft: 'join.bio', opt: true, placeholder: 'A few warm, honest sentences patients will read first.', rows: 3 }) + '</div>' : '');
    }
    if (step === 2) {
      body = '<h2>Your documents</h2><p class="muted small mt-1">BUSHEMI checks each one. A clear photo of each page is fine.</p><div class="mt-3 stack">' +
        reqDocs(type).map(d => { const f = (j.docs || {})[d[0]]; return '<label class="upload' + (f ? ' done' : '') + '"><input type="file" accept="image/*,.pdf" hidden data-on-input="join.file" data-doc="' + d[0] + '"><span class="ic-tile ' + (f ? 'green' : '') + '">' + I(f ? 'check' : 'upload') + '</span><span class="grow"><b>' + esc(d[1]) + '</b><small class="muted">' + (f ? esc(f) : esc(d[2])) + '</small></span><span class="link">' + (f ? 'Change' : 'Add') + '</span></label>'; }).join('') + '</div>' +
        C.simNote('Prototype: files are not uploaded anywhere. Only the file name is kept on this device.') +
        '<h3 class="mt-4">Two professional references</h3><p class="muted small mb-2">Previous employers or supervisors who can speak about your work.</p><div class="mt-2">' +
        C.input({ id: 'j-r1', label: 'Reference 1', draft: 'join.ref1', placeholder: 'Name, workplace, phone' }) + C.input({ id: 'j-r2', label: 'Reference 2', draft: 'join.ref2', placeholder: 'Name, workplace, phone' }) + '</div>';
    }
    if (step === 3) {
      const list = homeSvcs(type), canManaged = list.some(s => s.managedPrice != null);
      body = '<h2>Services and rates</h2><p class="muted small mt-1">Choose what you offer and set your own rate. Patients also pay a ' + BV.config.fees.independentServicePct + '% BUSHEMI service fee on top.</p><div class="mt-3">' +
        list.map(s => { const on = ((j.svc || {})[s.id] || {}).on, rate = (j.rates || {})[s.id]; return '<div class="card"><div class="between"><div class="grow"><b>' + esc(s.name) + '</b><small class="muted" style="display:block">' + s.duration + ' min · guideline ' + U.money(s.rateRange[0]) + ' to ' + U.money(s.rateRange[1]) + '</small></div><button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + !!on + '" aria-label="Offer ' + esc(s.name) + '" data-act="join.svc" data-v="' + s.id + '"><i></i></button></div>' +
          (on ? '<div class="mt-3">' + C.input({ id: 'j-rate-' + s.id, label: 'Your rate (Kwacha)', draft: 'join.rates.' + s.id, type: 'number', inputmode: 'numeric', hint: rate ? 'Patients see ' + U.money(+rate + Math.round(+rate * BV.config.fees.independentServicePct / 100)) + ' including the service fee' : '' }) + '</div>' : '') + '</div>'; }).join('') + '</div>' +
        (canManaged ? '<div class="card tint"><div class="between"><div class="grow"><b>Also join the BUSHEMI Care Team</b><small class="muted" style="display:block">Get visits assigned to you and paid per visit by BUSHEMI. Adds an interview and skills assessment.</small></div><button class="switch' + (j.managed ? ' on' : '') + '" role="switch" aria-checked="' + !!j.managed + '" aria-label="Also apply to the Care Team" data-act="join.managed"><i></i></button></div></div>' : '');
    }
    if (step === 4) {
      const needsArea = homeSvcs(type).some(s => ((j.svc || {})[s.id] || {}).on && s.mode === 'home');
      body = '<h2>Working days and areas</h2><div class="lab mt-3">Days you usually work</div><div class="week">' + U.WD.map((d, i) => '<button class="wk' + ((j.days || [])[i] ? ' on' : ' off') + '" data-act="join.day" data-v="' + i + '" aria-pressed="' + !!(j.days || [])[i] + '">' + d.slice(0, 1) + '<small>' + d + '</small></button>').join('') + '</div>' +
        '<div class="lab mt-4">Shifts</div>' + BV.avail.SHIFT_ORDER.map(k => '<div class="shift"><div><b>' + BV.avail.SHIFTS[k].label + '</b><small>' + BV.avail.SHIFTS[k].range + '</small></div><button class="switch' + ((j.shifts || []).includes(k) ? ' on' : '') + '" role="switch" aria-checked="' + (j.shifts || []).includes(k) + '" aria-label="' + BV.avail.SHIFTS[k].label + '" data-act="join.shift" data-v="' + k + '"><i></i></button></div>').join('') +
        (needsArea ? '<div class="lab mt-4">Areas you can travel to</div>' + C.multi(BV.data.areas, j.areas || [], 'join.area') : '<div class="callout mt-4">' + I('video', 'sm') + '<span>Your services are done by video or voice call, so you can work from anywhere.</span></div>');
    }
    if (step === 5) {
      const on = homeSvcs(type).filter(s => ((j.svc || {})[s.id] || {}).on);
      body = '<h2>Check and submit</h2><div class="card mt-3"><div class="row">' + U.avatar(j.name || 'You', 52) + '<div class="grow"><b>' + esc(j.name) + '</b><div class="muted small">' + esc(T[type].label) + ' · ' + esc(j.years) + ' years</div></div></div>' +
        C.kv(T[type].licenceLabel, esc(j.reg)) + C.kv('Languages', esc((j.langs || []).join(', '))) + C.kv('Services', esc(on.map(s => s.short + ' ' + U.money((j.rates || {})[s.id])).join(', '))) + C.kv('Works', esc(U.WD.filter((d, i) => (j.days || [])[i]).join(', '))) + (j.managed ? C.kv('Care Team', 'Applying') : '') + '</div>' +
        '<div class="callout mt-3">' + I('shieldcheck', 'sm') + '<span><b>What happens next</b>BUSHEMI checks your identity, qualification' + (T[type].regulator ? ', ' + T[type].regulator + ' registration' : '') + ', police clearance and references' + (j.managed ? ', then invites you for an interview and skills assessment' : '') + '. You will only appear to patients once verified.</span></div>' +
        C.simNote('Prototype: review is simulated. Use Demo tools to approve yourself.');
    }
    const back = step === 0 ? '/welcome' : '/join?step=' + (step - 1);
    const last = step === 5;
    const html = C.topbar({ title: 'Join BUSHEMI', back }) + C.steps(step, STEPS) + body +
      '<div class="book-bar"><div class="grow">' + (why ? '<small style="color:var(--err)">' + esc(why) + '</small>' : '<small>Ready</small>') + '</div><button class="btn primary" data-act="' + (last ? 'join.submit' : 'join.next') + '" data-v="' + (step + 1) + '"' + (why ? ' disabled' : '') + '>' + (last ? 'Submit for verification' : 'Continue') + '</button></div>';
    return { html, cls: 'hasbar', tab: null, title: 'Join' };
  }
  BV.act('join.next', v => BV.Router.go('/join?step=' + v));
  BV.act('join.type', v => { D.set('join.type', v); D.set('join.svc', {}); D.set('join.rates', {}); D.set('join.docs', {}); BV.Router.refresh(); });
  BV.act('join.lang', v => { const a = (jget('langs', [])).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); D.set('join.langs', a); BV.Router.refresh(); });
  BV.act('join.area', v => { const a = (jget('areas', [])).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); D.set('join.areas', a); BV.Router.refresh(); });
  BV.act('join.day', v => { const a = (jget('days', [1, 1, 1, 1, 1, 0, 0])).slice(); a[+v] = a[+v] ? 0 : 1; D.set('join.days', a); BV.Router.refresh(); });
  BV.act('join.shift', v => { const a = (jget('shifts', ['morning', 'afternoon'])).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); D.set('join.shifts', a); BV.Router.refresh(); });
  BV.act('join.managed', () => { D.set('join.managed', !jget('managed', false)); BV.Router.refresh(); });
  BV.act('join.svc', v => {
    const m = Object.assign({}, jget('svc', {})), on = !(m[v] && m[v].on); m[v] = { on }; D.set('join.svc', m);
    const s = BV.svc(v), r = Object.assign({}, jget('rates', {})); if (on && !r[v]) r[v] = Math.round((s.rateRange[0] + s.rateRange[1]) / 2 / 10) * 10; D.set('join.rates', r); BV.Router.refresh();
  });
  BV.act('join.file', (val, el) => { const f = el.files && el.files[0]; if (!f) return; const docs = Object.assign({}, jget('docs', {})); docs[el.dataset.doc] = f.name; D.set('join.docs', docs); BV.Router.refresh(); });
  /* defaults for step 4 so toggles render in their real state */
  const origJoin = join;
  BV.act('join.submit', () => {
    const j = D.get('join', {}), type = j.type;
    for (let i = 0; i < 5; i++) { const w = stepOk(i); if (w) { BV.UI.toast(w, 'err'); BV.Router.go('/join?step=' + i); return; } }
    const on = homeSvcs(type).filter(s => ((j.svc || {})[s.id] || {}).on);
    const id = U.uid('p'), phone = '0' + String(j.phone).replace(/\D/g, '').replace(/^260/, '').replace(/^0/, '');
    const needsArea = on.some(s => s.mode === 'home');
    const ids = BV.verify.checksFor({ type, model: 'independent', applyingManaged: !!j.managed });
    const checks = {}; ids.forEach(k => { checks[k] = { status: 'pending' }; });
    const split = x => String(x || '').split(',').map(t => t.trim()).filter(Boolean);
    BV.Store.update(s => s.pros.push({
      id, created: true, model: 'independent', applyingManaged: !!j.managed, type, title: T[type].label, name: j.name.trim(), phone, joined: new Date().getFullYear(),
      bio: j.bio && j.bio.trim() ? j.bio.trim() : 'New to BUSHEMI.', years: parseInt(j.years, 10), languages: j.langs, areas: needsArea ? (j.areas || []) : [], specialties: split(j.spec),
      services: on.map(sv => ({ id: sv.id, rate: parseInt((j.rates || {})[sv.id], 10) })), stats: { rating: 0, reviews: 0, visits: 0, responseMin: 30, acceptRate: 0 },
      availability: { days: j.days || [1, 1, 1, 1, 1, 0, 0], shifts: j.shifts || ['morning', 'afternoon'], blocked: [], online: true },
      verification: { status: 'in_review', submittedAt: Date.now(), checks }, docs: j.docs, regNumber: j.reg
    }));
    S.set('pro', id); S.set('epoch', BV.state().epoch); D.clear('join');
    BV.Router.go('/verification?new=1', { replace: true });
  });

  /* make the Draft hold sensible defaults the first time step 4 is shown */
  const base = BV.Router;
  BV.route('/welcome', welcome);
  BV.route('/join', p => {
    if (+p.query.step === 4) { if (!D.get('join.days')) D.set('join.days', [1, 1, 1, 1, 1, 0, 0]); if (!D.get('join.shifts')) D.set('join.shifts', ['morning', 'afternoon']); }
    return origJoin(p);
  });
})(window.BV);
