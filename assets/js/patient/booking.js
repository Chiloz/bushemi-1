/* BUSHEMI v3 · patient/booking.js
   Booking flow (3 steps), bookings list, booking detail with every status, live visit, reschedule,
   cancel, review and receipt. One flow serves both delivery models; the differences are explicit. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pt = BV.pt, D = BV.Draft;
  const SH = () => BV.avail.SHIFTS;

  /* ======================= small data sheets used by booking and Family ======================= */
  function sheetPerson(done) {
    const err = D.get('np_err', {});
    const html = '<h2>Add a person to care for</h2><p class="muted small mt-1">Only you and people you invite can see this. Professionals see it only after you agree.</p><div class="mt-3">' +
      C.input({ id: 'np-name', label: 'Full name', draft: 'np.name', err: err.name, autocomplete: 'off' }) +
      C.select({ id: 'np-rel', label: 'Relationship to you', draft: 'np.relation', def: 'Mother', options: ['Mother', 'Father', 'Spouse or partner', 'Child', 'Grandparent', 'Other relative', 'Friend'] }) +
      C.input({ id: 'np-age', label: 'Age', draft: 'np.age', type: 'number', inputmode: 'numeric', err: err.age }) +
      C.input({ id: 'np-cond', label: 'Health conditions', draft: 'np.conditions', opt: true, placeholder: 'e.g. diabetes, high blood pressure', hint: 'Separate with commas' }) +
      C.input({ id: 'np-all', label: 'Allergies', draft: 'np.allergies', opt: true, placeholder: 'e.g. penicillin' }) +
      '</div><button class="btn primary block" data-act="np.save">Save person</button>';
    BV.UI.sheet(html, { label: 'Add a person', onClose: () => { D.clear('np'); D.clear('np_err'); } });
    BV.pt._npDone = done;
  }
  BV.act('np.save', () => {
    const n = D.get('np', {}), err = {};
    if (!String(n.name || '').trim()) err.name = 'Please enter their name';
    const age = parseInt(n.age, 10);
    if (!(age >= 0 && age <= 120)) err.age = 'Enter an age between 0 and 120';
    if (Object.keys(err).length) { D.set('np_err', err); sheetPerson(BV.pt._npDone); return; }
    const split = x => String(x || '').split(',').map(t => t.trim()).filter(Boolean);
    const id = U.uid('r'), u = pt.user();
    BV.Store.update(s => s.recipients.push({ id, household: pt.hh().id, name: n.name.trim(), relation: n.relation || 'Mother', age, conditions: split(n.conditions), allergies: split(n.allergies), address: null, emergency: { name: u.name, phone: u.phone }, meds: [], vitals: { bp: [], sugar: [], weight: [] } }));
    const cb = BV.pt._npDone; D.clear('np'); D.clear('np_err'); BV.UI.closeSheet(); BV.UI.toast(U.firstName(n.name) + ' added');
    if (cb) cb(id); else BV.Router.refresh();
  });

  function sheetAddress(done) {
    const err = D.get('ad_err', {});
    const html = '<h2>Add an address</h2><p class="muted small mt-1">In Zambia a landmark often helps more than a street name. Add one so the professional can find you.</p><div class="mt-3">' +
      C.input({ id: 'ad-label', label: 'Name this place', draft: 'ad.label', placeholder: 'Home, Mother\'s house…', err: err.label }) +
      C.select({ id: 'ad-area', label: 'Area', draft: 'ad.area', def: pt.area(), options: BV.data.areas }) +
      C.input({ id: 'ad-line', label: 'Plot or street', draft: 'ad.line', placeholder: 'Plot 14, Hillview Road', err: err.line }) +
      C.input({ id: 'ad-lm', label: 'Landmark', draft: 'ad.landmark', placeholder: 'Blue gate next to the pharmacy', hint: 'Strongly recommended', err: err.landmark }) +
      '</div><button class="btn primary block" data-act="ad.save">Save address</button>';
    BV.UI.sheet(html, { label: 'Add an address', onClose: () => { D.clear('ad'); D.clear('ad_err'); } });
    BV.pt._adDone = done;
  }
  BV.act('ad.save', () => {
    const a = D.get('ad', {}), err = {};
    if (!String(a.label || '').trim()) err.label = 'Give it a name';
    if (!String(a.line || '').trim()) err.line = 'Enter a plot or street';
    if (!String(a.landmark || '').trim()) err.landmark = 'Add a landmark so we can find you';
    if (Object.keys(err).length) { D.set('ad_err', err); sheetAddress(BV.pt._adDone); return; }
    const id = U.uid('a');
    BV.Store.update(s => s.addresses.push({ id, household: pt.hh().id, label: a.label.trim(), area: a.area || pt.area(), line: a.line.trim(), landmark: a.landmark.trim() }));
    const cb = BV.pt._adDone; D.clear('ad'); D.clear('ad_err'); BV.UI.closeSheet(); BV.UI.toast('Address saved');
    if (cb) cb(id); else BV.Router.refresh();
  });
  BV.pt.sheetPerson = sheetPerson; BV.pt.sheetAddress = sheetAddress;

  /* ======================= day and time picker (used by booking and reschedule) ======================= */
  function picker(o) {
    const s = BV.state(), date = D.get(o.key + '.date'), time = D.get(o.key + '.time'), win = D.get(o.key + '.window');
    const N = o.model === 'managed' ? 10 : 14, days = [];
    for (let i = 0; i < N; i++) {
      const d = U.addDays(U.today(), i), dk = U.dkey(d);
      let n = 0, label = '';
      if (o.model === 'independent') { n = BV.avail.proSlots(o.pro, o.svc, dk, s, o.ignoreId).filter(x => x.ok).length; label = n ? n + ' free' : 'Full'; }
      else { n = BV.avail.managedWindows(o.svc, dk, o.area, s).filter(x => x.ok).length; label = n ? 'Open' : 'Full'; }
      days.push({ d, dk, n, label });
    }
    let h = '<div class="days" role="listbox" aria-label="Choose a day">' + days.map(x =>
      '<button class="day' + (x.dk === date ? ' on' : '') + '" role="option" aria-selected="' + (x.dk === date) + '" data-act="' + o.act + '.day" data-v="' + x.dk + '"' + (x.n ? '' : ' disabled') + ' aria-label="' + esc(U.fmtDay(x.d)) + ', ' + esc(x.label) + '"><small>' + (x.dk === U.dkey(U.today()) ? 'Today' : U.WD[U.wdIndex(x.d)]) + '</small><b>' + x.d.getDate() + '</b><em class="' + (x.n ? '' : 'none') + '">' + x.label + '</em></button>').join('') + '</div>';
    if (!date) return h + '<p class="muted small mt-2">Pick a day to see times.</p>';
    if (o.model === 'independent') {
      const slots = BV.avail.proSlots(o.pro, o.svc, date, s, o.ignoreId);
      if (!slots.some(x => x.ok)) h += '<div class="callout mt-3">' + I('info', 'sm') + '<span>' + esc(U.firstName(o.pro.name)) + ' has no free times on ' + esc(U.relDay(date)) + '. Try another day.</span></div>';
      BV.avail.SHIFT_ORDER.forEach(k => {
        const g = slots.filter(x => x.shift === k); if (!g.length) return;
        h += '<div class="lab mt-3">' + SH()[k].label + '</div><div class="slots">' + g.map(x => '<button class="slot' + (x.time === time ? ' on' : '') + '" data-act="' + o.act + '.time" data-v="' + x.time + '"' + (x.ok ? '' : ' disabled title="' + (x.reason === 'booked' ? 'Already booked' : x.reason === 'past' ? 'Too soon' : 'Unavailable') + '"') + '>' + x.time + '</button>').join('') + '</div>';
      });
      h += '<p class="muted small mt-3">Allow for ' + (o.svc.duration || 60) + ' minutes. Times already booked or too soon are crossed out.</p>';
    } else {
      const ws = BV.avail.managedWindows(o.svc, date, o.area, s);
      h += '<div class="lab mt-3">Arrival window</div>' + ws.map(w => '<button class="window' + (w.key === win ? ' on' : '') + '" data-act="' + o.act + '.win" data-v="' + w.key + '"' + (w.ok ? '' : ' disabled') + '><span><b>' + w.label + '</b><small>' + w.range + (w.limited ? ' · only a few spots' : '') + '</small></span>' + (w.ok ? (w.key === win ? I('check') : '') : '<span class="muted small">Full</span>') + '</button>').join('') +
        '<p class="muted small mt-2">BUSHEMI picks the professional and confirms the exact arrival time within your window.</p>';
    }
    return h;
  }
  function mkPicker(prefix, key, rerender) {
    BV.act(prefix + '.day', v => { D.set(key + '.date', v); D.set(key + '.time', null); D.set(key + '.window', null); rerender(); });
    BV.act(prefix + '.time', v => { D.set(key + '.time', v); rerender(); });
    BV.act(prefix + '.win', v => { D.set(key + '.window', v); rerender(); });
  }

  /* ======================= BOOKING FLOW ======================= */
  BV.act('book.start', v => {
    if (!pt.canBook()) { BV.UI.sheet('<h2>View-only access</h2><p class="muted mt-2">You can follow updates but cannot book. Ask the account owner to give you booking access in Family and access.</p><button class="btn primary block mt-4" data-act="ui.closeSheet">OK</button>'); return; }
    const parts = v.split('|'), cur = pt.cur(), rec = cur && cur.id;
    const addr = cur && cur.address ? cur.address : (pt.addresses().find(a => a.area === pt.area()) || pt.addresses()[0] || {}).id;
    D.set('book', { model: parts[0], svc: parts[1], pro: parts[2] || null, recipient: rec, addr: addr || null, date: null, time: null, window: null, notes: '', voucher: true, method: null, num: (pt.user() || {}).phone || '', share: true });
    BV.Router.go('/book?step=0');
  });
  const STEPS = ['Who and where', 'Date and time', 'Review and pay'];
  mkPicker('bk', 'book', () => BV.Router.refresh());
  BV.act('bk.rec', v => { D.set('book.recipient', v); const r = BV.state().recipients.find(x => x.id === v); if (r && r.address) D.set('book.addr', r.address); BV.Router.refresh(); });
  BV.act('bk.addr', v => { D.set('book.addr', v); BV.Router.refresh(); });
  BV.act('bk.addPerson', () => sheetPerson(id => { D.set('book.recipient', id); BV.Router.refresh(); }));
  BV.act('bk.addAddr', () => sheetAddress(id => { D.set('book.addr', id); BV.Router.refresh(); }));
  BV.act('bk.method', v => { D.set('book.method', v); BV.Router.refresh(); });
  BV.act('bk.voucher', () => { D.set('book.voucher', !D.get('book.voucher')); BV.Router.refresh(); });
  BV.act('bk.share', () => { D.set('book.share', !D.get('book.share')); BV.Router.refresh(); });
  BV.act('bk.next', v => BV.Router.go('/book?step=' + v));

  function bookingHeader(d, svc, pro) {
    return '<div class="card tint" style="display:flex;gap:12px;align-items:center"><span class="ic-tile ' + svc.tone + '">' + I(svc.icon) + '</span><div class="grow"><b>' + esc(svc.name) + '</b><div class="muted small">' + (pro ? 'with ' + esc(pro.name) : 'BUSHEMI Care Team will assign a professional') + '</div></div>' + C.badgeModel(d.model, true) + '</div>';
  }

  function book(p) {
    const s = BV.state(), d = D.get('book');
    if (!d) return pt.redirect('/find');
    const step = U.clamp(+p.query.step || 0, 0, 2), svc = BV.svc(d.svc), pro = d.pro ? s.pros.find(x => x.id === d.pro) : null;
    const people = pt.people(), addrs = pt.addresses(), video = svc.mode === 'video';
    const rec = people.find(x => x.id === d.recipient), addr = addrs.find(x => x.id === d.addr);
    const area = video ? pt.area() : (addr && addr.area);
    let body = '', ok = true, why = '', cta = 'Continue', ctaAct = 'bk.next', ctaV = step + 1;

    if (step === 0) {
      body = bookingHeader(d, svc, pro) + '<h2 class="mt-4">Who is this for?</h2><div class="mt-2">' +
        people.map(x => '<button class="radio-card' + (x.id === d.recipient ? ' on' : '') + '" role="radio" aria-checked="' + (x.id === d.recipient) + '" data-act="bk.rec" data-v="' + x.id + '"><span class="rd"></span>' + U.avatar(x.name, 38) + '<span class="grow"><b>' + esc(x.name) + '</b><small>' + esc(x.relation) + (x.age ? ', ' + x.age : '') + (x.conditions.length ? ' · ' + esc(x.conditions.join(', ')) : '') + '</small></span></button>').join('') +
        '<button class="btn secondary sm" data-act="bk.addPerson">' + I('plus', 'sm') + 'Add someone else</button></div>';
      if (video) {
        body += '<h2 class="mt-5">Where will the call be?</h2><div class="callout mt-2">' + I('video', 'sm') + '<span><b>From anywhere</b>You will get a link and the professional can switch to a voice call if the signal is weak.</span></div>';
      } else {
        body += '<h2 class="mt-5">Where should the professional come?</h2><div class="mt-2">' +
          addrs.map(a => '<button class="radio-card' + (a.id === d.addr ? ' on' : '') + '" role="radio" aria-checked="' + (a.id === d.addr) + '" data-act="bk.addr" data-v="' + a.id + '"><span class="rd"></span><span class="ic-tile">' + I('pin') + '</span><span class="grow"><b>' + esc(a.label) + ' · ' + esc(a.area) + '</b><small>' + esc(a.line) + '<br>' + esc(a.landmark) + '</small></span></button>').join('') +
          '<button class="btn secondary sm" data-act="bk.addAddr">' + I('plus', 'sm') + 'Add an address</button></div>';
      }
      body += '<div class="mt-4">' + C.textarea({ id: 'bk-notes', label: svc.mode === 'plan' ? 'Tell us about the care needed' : 'What should the professional know?', draft: 'book.notes', opt: true, placeholder: 'Reason for the visit, anything that worries you, access to the house…', rows: 3 }) + '</div>';
      if (!rec) { ok = false; why = 'Choose who this is for'; }
      else if (!video && !addr) { ok = false; why = 'Choose or add an address'; }
      else if (d.model === 'independent' && !BV.match.covers(pro, area, svc)) { ok = false; why = esc(pro.name) + ' does not cover ' + area + '. Choose another address or professional.'; }
      else if (d.model === 'managed' && !video && !BV.data.managedCoverage.includes(area)) { ok = false; why = 'The BUSHEMI Care Team does not cover ' + area + ' yet.'; }
    }

    if (step === 1) {
      if (!d.date) {
        const first = d.model === 'independent' ? BV.avail.nextAvailable(pro, svc, s) : BV.avail.nextManaged(svc, area, s);
        if (first) { D.set('book.date', first.date); d.date = first.date; }
      }
      body = bookingHeader(d, svc, pro) + '<h2 class="mt-4">' + (svc.mode === 'plan' ? 'When should we call you?' : 'Choose a day and time') + '</h2><div class="mt-2">' +
        picker({ key: 'book', act: 'bk', model: d.model, pro, svc, area }) + '</div>';
      const has = d.model === 'independent' ? !!d.time : !!d.window;
      if (!d.date || !has) { ok = false; why = d.model === 'independent' ? 'Choose a time to continue' : 'Choose an arrival window to continue'; }
    }

    if (step === 2) {
      const hh = pt.hh(), vAvail = !hh.voucherUsed, useV = vAvail && d.voucher;
      const q = BV.pricing.quote({ service: svc, model: d.model, pro, voucher: useV });
      const methods = [['mtn', 'MTN Mobile Money', 'wallet'], ['airtel', 'Airtel Money', 'wallet'], ['zamtel', 'Zamtel Kwacha', 'wallet'], ['card', 'Debit or credit card', 'bag']];
      if (d.model === 'managed') methods.push(['cash', 'Pay after the visit', 'receipt']);
      const mm = ['mtn', 'airtel', 'zamtel'].includes(d.method);
      body = bookingHeader(d, svc, pro) +
        '<div class="card mt-4"><b>Summary</b>' + C.kv('For', esc(rec.name)) + C.kv('When', esc(U.relDay(d.date) + ', ' + (d.model === 'independent' ? d.time : SH()[d.window].label.toLowerCase() + ' window'))) + C.kv('Where', video ? 'Video call' : esc(addr.label + ', ' + addr.area)) + C.kv('Who', pro ? esc(pro.name) : 'Assigned by BUSHEMI') + '</div>' +
        '<div class="card"><b>' + (d.model === 'managed' ? 'How BUSHEMI-managed care works' : 'How booking an independent professional works') + '</b><div class="mt-3">' + C.modelFacts(d.model) + '</div></div>' +
        '<div class="card"><b>Price</b><div class="mt-2">' + C.priceLines(q) + '</div>' +
        (vAvail ? C.toggle({ label: 'Use welcome voucher ' + BV.config.voucher.code, sub: BV.config.voucher.pct + '% off your first booking', on: d.voucher, act: 'bk.voucher' }) : '') + '</div>' +
        '<h2 class="mt-4">Pay with</h2><div class="mt-2">' + methods.map(m => '<button class="radio-card' + (d.method === m[0] ? ' on' : '') + '" role="radio" aria-checked="' + (d.method === m[0]) + '" data-act="bk.method" data-v="' + m[0] + '"><span class="rd"></span><span class="ic-tile ' + (m[0] === 'mtn' ? 'amber' : m[0] === 'airtel' ? 'rose' : m[0] === 'zamtel' ? 'green' : '') + '">' + I(m[2]) + '</span><span class="grow"><b>' + m[1] + '</b><small>' + (m[0] === 'cash' ? 'We will send a payment request after the visit' : m[0] === 'card' ? 'Visa or Mastercard' : 'Approve with your PIN') + '</small></span></button>').join('') + '</div>' +
        (mm ? '<div class="mt-3">' + C.input({ id: 'bk-num', label: 'Mobile money number', draft: 'book.num', inputmode: 'tel', autocomplete: 'tel', hint: 'You will get an approval prompt on this phone' }) + '</div>' : '') +
        '<div class="card flat mt-3">' + C.toggle({ label: 'Share ' + esc(U.firstName(rec.name)) + '\'s health summary', sub: 'Allergies, conditions and medicines, shown to the professional only after they accept. You can change this any time.', on: d.share, act: 'bk.share' }) + '</div>' +
        '<p class="muted small mt-3">' + I('info', 'sm') + ' ' + esc(BV.pricing.cancellation({ model: d.model, status: 'confirmed', date: d.date, time: d.time || SH()[d.window].from, window: d.window, price: q }, 0).text.replace('Free to cancel until', 'Cancellation: free until').replace('Inside', 'Cancellation: inside')).replace(/\.\s*$/, '') + '.</p>' +
        C.simNote('Prototype: no real payment is taken. In the live product, mobile money prompts and card payments go through a licensed payment provider.');
      cta = d.model === 'independent' ? 'Send request' : (svc.mode === 'plan' ? 'Request assessment' : 'Request booking'); ctaAct = 'bk.submit'; ctaV = '';
      const mmNum = String(d.num || '').replace(/\s/g, '');
      if (!d.method) { ok = false; why = 'Choose how to pay'; }
      else if (mm && !/^(\+?260|0)?9\d{8}$/.test(mmNum)) { ok = false; why = 'Enter a valid Zambian mobile number'; }
      d._q = q;
    }

    const back = step === 0 ? (d.model === 'managed' || !pro ? '/service/' + svc.id : '/pro/' + pro.id + '?svc=' + svc.id) : '/book?step=' + (step - 1);
    const total = step === 2 && d._q ? '<div class="grow"><small>Total</small><b>' + U.money(d._q.total) + '</b></div>' : '<div class="grow">' + (!ok ? '<small style="color:var(--err)">' + why + '</small>' : '<small>Ready</small>') + '</div>';
    const html = C.topbar({ title: 'Book', back }) + C.steps(step, STEPS) + body +
      '<div class="book-bar">' + total + '<button class="btn ' + (d.model === 'managed' ? 'green' : 'primary') + '" data-act="' + ctaAct + '" data-v="' + ctaV + '"' + (ok ? '' : ' disabled') + '>' + cta + '</button></div>';
    return { html, cls: 'hasbar', tab: 'find', title: 'Book ' + svc.name };
  }

  BV.act('bk.submit', () => {
    const d = D.get('book'), s = BV.state(); if (!d) return;
    const svc = BV.svc(d.svc), pro = d.pro && s.pros.find(x => x.id === d.pro), addr = s.addresses.find(x => x.id === d.addr);
    const video = svc.mode === 'video';
    const mm = ['mtn', 'airtel', 'zamtel'].includes(d.method);
    const names = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', zamtel: 'Zamtel Kwacha', card: 'your card', cash: 'pay after visit' };
    const run = () => {
      BV.UI.sheet('<div class="center"><div class="spin"></div><h2>' + (mm ? 'Check your phone' : d.method === 'card' ? 'Authorising card' : 'Sending your request') + '</h2><p class="muted mt-2">' +
        (mm ? 'A prompt for ' + names[d.method] + ' should appear on ' + esc(d.num) + '. In this prototype it approves itself.' : 'One moment.') + '</p>' + C.simNote('Simulated. No money moves.') + '</div>', { label: 'Processing', onClose: () => {} });
      BV.Net.call(() => {
        const live = BV.state();
        if (d.model === 'independent') {
          const ok = BV.avail.proSlots(pro, svc, d.date, live).some(x => x.time === d.time && x.ok);
          if (!ok) throw Object.assign(new Error('taken'), { taken: true });
        }
        const address = video ? { label: 'Video call', area: pt.area(), line: '', landmark: '' } : { label: addr.label, area: addr.area, line: addr.line, landmark: addr.landmark };
        return BV.booking.create({ household: pt.hh().id, recipient: d.recipient, service: d.svc, model: d.model, pro: d.pro, date: d.date, time: d.time, window: d.window, address, notes: d.notes, voucher: d.voucher, payment: { method: d.method, number: d.num }, shareHealth: d.share });
      }).then(id => {
        D.clear('book'); BV.UI.closeSheet(); BV.Router.go('/booking/' + id + '?new=1', { replace: true });
      }).catch(e => {
        if (e.taken) {
          BV.UI.sheetBody('<div class="center"><div class="tick" style="background:var(--warn-bg);color:var(--warn)">' + I('clock') + '</div><h2>That time was just taken</h2><p class="muted mt-2">Someone else booked it. Your payment was not taken. Please choose another time.</p><button class="btn primary block mt-4" data-act="bk.retime">Choose another time</button></div>');
        } else {
          BV.UI.sheetBody('<div class="center"><div class="tick" style="background:var(--err-bg);color:var(--err)">' + I('wifioff') + '</div><h2>No connection</h2><p class="muted mt-2">We could not send your request. Nothing was charged and your details are saved.</p><div class="stack mt-4"><button class="btn primary block" data-act="bk.submit">Try again</button><button class="btn secondary block" data-act="ui.closeSheet">Close</button></div></div>');
        }
      });
    };
    run();
  });
  BV.act('bk.retime', () => { D.set('book.time', null); D.set('book.window', null); BV.UI.closeSheet(); BV.Router.go('/book?step=1', { replace: true }); });

  /* ======================= BOOKINGS LIST ======================= */
  function bookings() {
    const s = BV.state(), hh = pt.hh(), tab = D.get('bk.tab', 'upcoming'), all = BV.booking.forHousehold(s, hh.id);
    const up = all.filter(b => BV.booking.isOpen(b)), past = all.filter(b => b.status === 'completed').reverse(), other = all.filter(b => ['cancelled', 'declined', 'expired'].includes(b.status)).reverse();
    const list = tab === 'upcoming' ? up : tab === 'past' ? past : other;
    const empties = { upcoming: C.empty('cal', 'No upcoming visits', 'When you book care it will show up here.', { label: 'Find care', act: 'nav', v: '/find' }), past: C.empty('clipboard', 'No past visits yet', 'Visit summaries and receipts will be kept here.'), cancelled: C.empty('check', 'Nothing here', 'Cancelled or declined requests appear here.') };
    const html = C.topbar({ title: 'Visits', back: false }) +
      '<div class="seg" role="tablist">' + [['upcoming', 'Upcoming', up.length], ['past', 'Past', past.length], ['cancelled', 'Cancelled', other.length]].map(x => '<button role="tab" aria-selected="' + (tab === x[0]) + '" class="' + (tab === x[0] ? 'on' : '') + '" data-act="bk.tab" data-v="' + x[0] + '">' + x[1] + (x[2] ? ' (' + x[2] + ')' : '') + '</button>').join('') + '</div>' +
      (list.length ? list.map(pt.bookingCard).join('') : empties[tab]);
    return { html, tab: 'bookings', title: 'Visits' };
  }
  BV.act('bk.tab', v => { D.set('bk.tab', v); BV.Router.refresh(); });

  /* ======================= BOOKING DETAIL ======================= */
  function statusBlock(b, s, pro) {
    const first = pro ? U.firstName(pro.name) : '';
    switch (b.status) {
      case 'requested': {
        const left = b.expiresAt ? U.until(b.expiresAt) : '';
        return '<div class="callout">' + I('clock', 'sm') + '<span><b>Waiting for ' + esc(first) + ' to accept</b>She usually replies within about ' + pro.stats.responseMin + ' minutes. If there is no answer by ' + (b.expiresAt ? U.clock(b.expiresAt) + ' (in ' + left + ')' : 'the deadline') + ', the request expires and your payment hold is released.</span></div>';
      }
      case 'assigning':
        return b.noMatch ? '<div class="callout warn">' + I('alert', 'sm') + '<span><b>We need to agree another time</b>No professional in the Care Team is free in that window. A coordinator will call you, or you can pick a different window.</span></div>'
          : '<div class="callout ok">' + I('shieldcheck', 'sm') + '<span><b>The BUSHEMI Care Team is choosing the best professional</b>This usually takes a few minutes. You will get a notification as soon as someone is assigned.</span></div>';
      case 'confirmed':
        return b.model === 'managed' ? '<div class="callout ok">' + I('shieldcheck', 'sm') + '<span><b>' + esc(pro.name) + ' is assigned</b>BUSHEMI has confirmed your visit. If anything changes we will arrange a replacement.</span></div>'
          : '<div class="callout ok">' + I('check', 'sm') + '<span><b>' + esc(pro.name) + ' accepted</b>We will remind you the day before, and tell you when they set off.</span></div>';
      case 'en_route': return '<div class="callout">' + I('pulse', 'sm') + '<span><b>' + esc(first) + ' is on the way</b>Open tracking to see the estimated arrival.</span></div>';
      case 'in_progress': return '<div class="callout">' + I('pulse', 'sm') + '<span><b>Visit in progress</b>' + esc(pro.name) + ' is with ' + esc(U.firstName(s.recipients.find(r => r.id === b.recipient).name)) + '.</span></div>';
      case 'report_due': return '<div class="callout">' + I('clipboard', 'sm') + '<span><b>Visit finished</b>' + esc(first) + ' is writing the visit summary. You will be notified when it is ready.</span></div>';
      case 'completed': return '<div class="callout ok">' + I('check', 'sm') + '<span><b>Visit completed</b>The summary is below and saved in the care history.</span></div>';
      case 'declined': case 'expired': return '<div class="callout err">' + I('alert', 'sm') + '<span><b>' + (b.status === 'declined' ? esc(pro.name) + ' could not take this request' : 'No response in time') + '</b>Your payment hold was released. Nothing was charged.</span></div>';
      case 'cancelled': return '<div class="callout">' + I('close', 'sm') + '<span><b>Cancelled' + (b.cancel && b.cancel.by !== 'patient' ? ' by ' + (pro ? esc(pro.name) : 'BUSHEMI') : '') + '</b>' + (b.cancel && b.cancel.fee ? 'A late-cancellation fee of ' + U.money(b.cancel.fee) + ' applies (simulated).' : 'No charge.') + '</span></div>';
    }
    return '';
  }

  function alternatives(b, s) {
    const svc = BV.svc(b.service), alts = BV.match.alternatives(b, s), area = b.address.area;
    const mOk = svc.managedPrice != null && (svc.mode === 'video' || BV.data.managedCoverage.includes(area));
    let h = C.section('Other ways to get this care');
    if (mOk) {
      const n = BV.avail.nextManaged(svc, area, s);
      h += '<div class="model-card managed"><h3>' + C.badgeModel('managed') + '</h3><p>Let BUSHEMI choose a checked professional for you.' + (n ? ' Next availability: ' + esc(U.relDay(n.date)) + '.' : '') + '</p><div class="between"><b style="font-size:1.15rem">' + U.money(svc.managedPrice) + '</b><button class="btn green sm" data-act="book.start" data-v="managed|' + svc.id + '">Book with BUSHEMI</button></div></div>';
    }
    if (alts.length) h += '<div class="mt-3">' + alts.map(x => C.provCard(x.pro, { svc, next: x.next })).join('') + '</div>';
    if (!mOk && !alts.length) h += C.empty('search', 'No similar options right now', 'Try another area or time.', { label: 'Browse services', act: 'nav', v: '/find' });
    return h;
  }

  function reportBlock(b, s, pro) {
    const r = b.report; if (!r) return '';
    const v = r.vitals || {}, vit = [['Blood pressure', v.bp, 'mmHg'], ['Pulse', v.pulse, 'bpm'], ['Temperature', v.temp, '°C'], ['Blood sugar', v.sugar, 'mmol/L'], ['Oxygen', v.spo2, '%']].filter(x => x[1]);
    return C.section('Visit summary') + '<div class="card">' +
      (r.escalate ? '<div class="callout err" style="margin-bottom:12px">' + I('alert', 'sm') + '<span><b>Follow-up advised</b>' + esc(r.followUpNote || 'Please visit your clinic soon.') + '</span></div>' : '') +
      (vit.length ? '<div class="lab">Readings</div><div class="chips" style="margin-bottom:12px">' + vit.map(x => '<span class="badge neutral">' + x[0] + ' ' + esc(x[1]) + ' ' + x[2] + '</span>').join('') + '</div>' : '') +
      ((r.care || []).length ? '<div class="lab">What was done</div><div class="chips" style="margin-bottom:12px">' + r.care.map(x => '<span class="badge ok">' + I('check', 'sm') + esc(x) + '</span>').join('') + '</div>' : '') +
      (r.observations ? '<div class="lab">What the professional noticed</div><p style="margin-bottom:12px">' + esc(r.observations) + '</p>' : '') +
      (r.advice ? '<div class="lab">Advice for the family</div><p style="margin-bottom:12px">' + esc(r.advice) + '</p>' : '') +
      (r.followUpNeeded && !r.escalate ? '<div class="callout warn">' + I('cal', 'sm') + '<span><b>Follow-up</b>' + esc(r.followUpNote || 'A follow-up visit is suggested.') + '</span></div>' : '') +
      '<p class="muted small mt-3">Written by ' + esc(pro.name) + ' · ' + U.relDay(U.dkey(new Date(r.submittedAt))) + (b.model === 'managed' ? (r.review === 'approved' ? ' · reviewed by the BUSHEMI clinical lead' : ' · awaiting clinical lead review') : ' · independent professional\'s own record') + '</p></div>';
  }

  function booking(p) {
    const s = BV.state(), hh = pt.hh(), b = BV.booking.byId(s, p.params.id);
    if (!b || b.household !== hh.id) return { html: C.topbar({ title: 'Booking', back: '/bookings' }) + C.empty('search', 'Booking not found', 'It may have been removed when the demo was reset.', { label: 'See my visits', act: 'nav', v: '/bookings' }), tab: 'bookings' };
    const svc = BV.svc(b.service), pro = b.pro && s.pros.find(x => x.id === b.pro), r = s.recipients.find(x => x.id === b.recipient);
    const st = b.status, open = BV.booking.isOpen(b);
    const canResched = (st === 'confirmed') || (b.model === 'managed' && st === 'assigning');
    const canCancel = ['requested', 'assigning', 'confirmed'].includes(st);
    const acts = [];
    if (['en_route', 'in_progress'].includes(st) || (b.mode === 'video' && st === 'confirmed')) acts.push('<button class="btn primary block" data-act="nav" data-v="/booking/' + b.id + '/track">' + I(b.mode === 'video' ? 'video' : 'map', 'sm') + (b.mode === 'video' ? 'Open call room' : 'Track visit') + '</button>');
    if (open && st !== 'report_due') acts.push('<button class="btn secondary block" data-act="nav" data-v="/chat/' + b.id + '">' + I('chat', 'sm') + 'Message ' + (b.model === 'managed' ? 'the care team' : esc(U.firstName(pro.name))) + '</button>');
    if (st === 'completed' && !b.review && pro) acts.unshift('<button class="btn primary block" data-act="rv.open" data-v="' + b.id + '">' + I('star', 'sm') + 'Review ' + esc(U.firstName(pro.name)) + '</button>');
    if (b.payment.state === 'due') acts.unshift('<button class="btn primary block" data-act="pay.now" data-v="' + b.id + '">' + I('wallet', 'sm') + 'Pay ' + U.money(b.price.total) + '</button>');
    if (st === 'completed') acts.push('<button class="btn secondary block" data-act="nav" data-v="/booking/' + b.id + '/receipt">' + I('receipt', 'sm') + 'View receipt</button>');
    if (['completed', 'cancelled'].includes(st) && pro && b.model === 'independent') acts.push('<button class="btn secondary block" data-act="book.start" data-v="independent|' + svc.id + '|' + pro.id + '">Book ' + esc(U.firstName(pro.name)) + ' again</button>');
    if (['completed', 'cancelled'].includes(st) && b.model === 'managed') acts.push('<button class="btn secondary block" data-act="book.start" data-v="managed|' + svc.id + '">Book again</button>');
    const rowActs = [];
    if (canResched) rowActs.push('<button class="btn secondary" data-act="rs.open" data-v="' + b.id + '">' + I('cal', 'sm') + 'Reschedule</button>');
    if (canCancel) rowActs.push('<button class="btn danger-o" data-act="cx.open" data-v="' + b.id + '">Cancel</button>');
    const pendingChange = b.change ? '<div class="callout warn mt-3">' + I('clock', 'sm') + '<span><b>New time requested</b>You asked to move this visit to ' + esc(U.when(b.change.date, b.change.time)) + '. Your current time stands until ' + esc(U.firstName(pro.name)) + ' agrees.</span></div>' : '';
    const proCard = pro ? '<button class="card clickable list-row" style="border:0;padding:14px;margin-bottom:12px" data-act="nav" data-v="/pro/' + pro.id + '?svc=' + svc.id + '">' + U.avatar(pro.name, 52, b.model === 'managed') + '<span class="grow"><b>' + esc(pro.name) + '</b><small>' + esc(pro.title.replace(' · BUSHEMI Care Team', '').replace(' · BUSHEMI Clinic', '')) + '</small><span class="row wrap" style="margin-top:6px;gap:6px">' + C.badgeModel(b.model, true) + C.verifyBadge(pro) + '</span></span>' + I('chev', 'chev') + '</button>' :
      '<div class="card flat" style="display:flex;gap:12px;align-items:center"><span class="ic-tile green">' + I('users') + '</span><div class="grow"><b>BUSHEMI Care Team</b><div class="muted small">Choosing the best verified professional for you</div></div></div>';
    const why = b.match && b.model === 'managed' ? '<div class="card tint"><b>Why this match</b><ul class="facts mt-2">' + b.match.reasons.map(x => '<li>' + I('check', 'sm') + '<div><span style="color:var(--ink)">' + esc(x) + '</span></div></li>').join('') + '</ul></div>' : '';
    const newBanner = p.query.new ? '<div class="card green" style="text-align:center"><div class="tick">' + I('check') + '</div><h2>' + (b.model === 'independent' ? 'Request sent' : 'Booking requested') + '</h2><p class="muted mt-1">Reference ' + esc(b.ref) + '</p><p class="mt-2">' + (b.model === 'independent' ? esc(pro.name) + ' will accept or decline. Your payment is held, not charged, until then.' : 'The BUSHEMI Care Team is choosing a professional. We will notify you shortly.') + '</p></div>' : '';

    const html = C.topbar({ title: svc.name, sub: 'Ref ' + b.ref, back: '/bookings' }) + newBanner +
      '<div class="card"><div class="between"><span class="lab" style="margin:0">Status</span>' + C.statusPill(b, 'patient') + '</div><div class="mt-3">' + C.journey(b) + '</div></div>' +
      statusBlock(b, s, pro) + pendingChange +
      '<div class="stack mt-3">' + acts.join('') + (rowActs.length ? '<div class="' + (rowActs.length > 1 ? 'btn-pair' : '') + '" style="display:grid;grid-template-columns:' + (rowActs.length > 1 ? '1fr 1fr' : '1fr') + ';gap:10px">' + rowActs.join('') + '</div>' : '') + '</div>' +
      (['declined', 'expired'].includes(st) || (st === 'cancelled' && b.cancel && b.cancel.by !== 'patient') ? alternatives(b, s) : '') +
      C.section(pro ? 'Your professional' : 'Your care') + proCard + why +
      C.section('Visit details') + '<div class="card">' + C.kv('For', esc(r.name)) + C.kv('When', esc(U.when(b.date, b.time || (b.window ? SH()[b.window].label.toLowerCase() + ' window' : '')))) +
      C.kv('Where', b.mode === 'video' ? 'Video call' : esc(b.address.label + ', ' + b.address.area) + (b.address.landmark ? '<br><small class="muted">' + esc(b.address.landmark) + '</small>' : '')) +
      C.kv('Delivered by', C.badgeModel(b.model)) + (b.notes ? C.kv('Your note', esc(b.notes)) : '') +
      C.kv('Health summary', b.consent.shareHealth ? 'Shared after acceptance' : 'Not shared') + '</div>' +
      (st === 'completed' ? reportBlock(b, s, pro) : '') +
      C.section('Payment') + '<div class="card">' + C.priceLines(b.price) + '<p class="muted small mt-2">' + I('wallet', 'sm') + ' ' + esc(C.paymentLabel(b)) + ' · ' + esc({ mtn: 'MTN Mobile Money', airtel: 'Airtel Money', zamtel: 'Zamtel Kwacha', card: 'Card', cash: 'Pay after visit' }[b.payment.method] || '') + '</p></div>' +
      C.section('Activity') + '<div class="card">' + C.timeline(b) + '</div>' +
      '<div class="callout warn mt-3">' + I('alert', 'sm') + '<span><b>Emergency?</b>Call ' + BV.config.emergencyNumber + ' or go to the nearest hospital.</span></div>';
    return { html, tab: 'bookings', title: svc.name, onMount() { if (p.query.review && st === 'completed' && !b.review) BV.acts['rv.open'](b.id); } };
  }

  BV.act('pay.now', v => BV.UI.confirm({ title: 'Pay now?', text: 'Simulated payment. In the live product you would approve a mobile money prompt.', yes: 'Pay (simulated)', onYes: () => { BV.booking.payNow(v); BV.UI.toast('Payment received (simulated)'); } }));

  /* ======================= CANCEL ======================= */
  BV.act('cx.open', v => {
    const b = BV.booking.byId(BV.state(), v), terms = BV.pricing.cancellation(b);
    const reasons = ['Plans changed', 'Found another option', 'Booked by mistake', 'Person is feeling better', 'Other'], cur = D.get('cx.reason', '');
    BV.UI.sheet('<h2>Cancel this booking?</h2><div class="callout ' + (terms.free ? 'ok' : 'warn') + ' mt-3">' + I(terms.free ? 'check' : 'alert', 'sm') + '<span><b>' + (terms.free ? 'No charge' : 'Late-cancellation fee: ' + U.money(terms.fee)) + '</b>' + esc(terms.text) + '</span></div>' +
      '<div class="lab mt-4">Reason (optional)</div>' + C.choice(reasons, cur, 'cx.reason') +
      '<div class="stack mt-4"><button class="btn danger block" data-act="cx.confirm" data-v="' + b.id + '">Cancel booking</button><button class="btn secondary block" data-act="ui.closeSheet">Keep booking</button></div>', { label: 'Cancel booking' });
  });
  BV.act('cx.reason', (v) => { D.set('cx.reason', v); BV.acts['cx.open'](BV.Router.cur.params.id); });
  BV.act('cx.confirm', v => { BV.booking.cancel(v, 'patient', D.get('cx.reason', '')); D.clear('cx'); BV.UI.closeSheet(); BV.UI.toast('Booking cancelled'); });

  /* ======================= RESCHEDULE ======================= */
  function rsSheet() {
    const s = BV.state(), b = BV.booking.byId(s, BV.Router.cur.params.id), svc = BV.svc(b.service), pro = b.pro && s.pros.find(x => x.id === b.pro);
    const model = b.model, has = model === 'independent' ? D.get('rs.time') : D.get('rs.window');
    const html = '<h2>Choose a new time</h2><p class="muted small mt-1">' + (model === 'independent' ? esc(pro.name) + ' will need to agree. Your current time stays until they do.' : 'The care team will re-confirm a professional for the new time.') + '</p><div class="mt-3">' +
      picker({ key: 'rs', act: 'rs', model, pro, svc, area: b.address.area, ignoreId: b.id }) + '</div>' +
      '<button class="btn primary block mt-4" data-act="rs.send" data-v="' + b.id + '"' + (D.get('rs.date') && has ? '' : ' disabled') + '>' + (model === 'independent' ? 'Ask for this time' : 'Move my booking') + '</button>';
    BV.UI.sheet(html, { label: 'Reschedule', tall: true, onClose: () => D.clear('rs') });
  }
  mkPicker('rs', 'rs', () => rsSheet());
  BV.act('rs.open', v => { D.clear('rs'); rsSheet(); });
  BV.act('rs.send', v => {
    const c = { date: D.get('rs.date'), time: D.get('rs.time'), window: D.get('rs.window') };
    BV.booking.requestChange(v, c); D.clear('rs'); BV.UI.closeSheet();
    BV.UI.toast(BV.booking.byId(BV.state(), v).model === 'independent' ? 'Request sent to the professional' : 'Care team is re-confirming');
  });

  /* ======================= REVIEW ======================= */
  function rvSheet() {
    const b = BV.booking.byId(BV.state(), D.get('rv.id')), pro = BV.state().pros.find(x => x.id === b.pro), rating = D.get('rv.rating', 0), tags = D.get('rv.tags', []);
    const html = '<h2>How was ' + esc(U.firstName(pro.name)) + '\'s visit?</h2><p class="muted small mt-1">Your review is public on their profile with your first name and initial.</p>' +
      '<div class="rate-stars" role="radiogroup" aria-label="Rating">' + [1, 2, 3, 4, 5].map(n => '<button class="rate-star' + (n <= rating ? ' on' : '') + '" role="radio" aria-checked="' + (n === rating) + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" data-act="rv.star" data-v="' + n + '">' + I('star') + '</button>').join('') + '</div>' +
      (rating ? '<div class="lab">What went well?</div>' + C.multi(BV.data.reviewTags, tags, 'rv.tag') : '') +
      (rating ? '<div class="mt-3">' + C.textarea({ id: 'rv-text', label: 'Tell other families more', draft: 'rv.text', opt: true, placeholder: 'What was it like?', rows: 3 }) + C.textarea({ id: 'rv-priv', label: b.model === 'managed' ? 'Private note to the clinical lead' : 'Private note to BUSHEMI support', draft: 'rv.priv', opt: true, hint: 'Never shown on the profile.', rows: 2 }) + '</div>' : '') +
      '<button class="btn primary block mt-3" data-act="rv.send"' + (rating ? '' : ' disabled') + '>Submit review</button>';
    BV.UI.sheet(html, { label: 'Review', tall: true });
  }
  BV.act('rv.open', v => { D.clear('rv'); D.set('rv.id', v); rvSheet(); });
  BV.act('rv.star', v => { D.set('rv.rating', +v); rvSheet(); });
  BV.act('rv.tag', v => { const t = D.get('rv.tags', []).slice(), i = t.indexOf(v); if (i > -1) t.splice(i, 1); else t.push(v); D.set('rv.tags', t); rvSheet(); });
  BV.act('rv.send', () => {
    const id = D.get('rv.id'), rating = D.get('rv.rating', 0); if (!rating) return;
    BV.booking.review(id, { rating, tags: D.get('rv.tags', []), text: D.get('rv.text', ''), privateNote: D.get('rv.priv', '') });
    D.clear('rv'); BV.UI.closeSheet(); BV.UI.toast('Thank you for your review');
  });

  /* ======================= LIVE VISIT / CALL ======================= */
  function mapSvg() {
    return '<div class="map"><svg viewBox="0 0 360 190" role="img" aria-label="Illustrative route from the professional to the home"><rect width="360" height="190" fill="#E7EEFD"/>' +
      '<g stroke="#fff" stroke-width="8" opacity=".9"><path d="M0 60H360M0 130H360M70 0V190M180 0V190M290 0V190"/></g><g stroke="#fff" stroke-width="3" opacity=".8"><path d="M0 95H360M125 0V190M235 0V190"/></g>' +
      '<rect x="205" y="98" width="52" height="28" rx="6" fill="#CFE6D3"/><rect x="20" y="10" width="40" height="38" rx="6" fill="#CFE6D3"/><rect x="300" y="140" width="46" height="36" rx="6" fill="#D9E2F7"/>' +
      '<path id="route" class="route" d="M30 160 C 90 160, 100 100, 150 95 S 230 60, 320 45"/>' +
      '<circle cx="320" cy="45" r="13" fill="#1B7F2A"/><path d="M314 45l4 4 8-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g id="marker"><circle r="16" fill="#2557E8" opacity=".2"/><circle r="9" fill="#2557E8" stroke="#fff" stroke-width="3"/></g></svg></div>';
  }
  function track(p) {
    const s = BV.state(), b = BV.booking.byId(s, p.params.id);
    if (!b || b.household !== pt.hh().id) return BV.shared.notFound();
    const pro = s.pros.find(x => x.id === b.pro), svc = BV.svc(b.service), back = '/booking/' + b.id;
    if (!pro || !['confirmed', 'en_route', 'in_progress', 'report_due', 'completed'].includes(b.status)) return { html: C.topbar({ title: 'Live visit', back }) + C.empty('clock', 'Nothing live yet', 'Tracking opens once a professional is confirmed.', { label: 'Back to booking', act: 'nav', v: back }), tab: 'bookings' };

    if (b.mode === 'video') {
      const voice = D.get('call.voice', false), inCall = b.status === 'in_progress';
      const secs = inCall ? Math.floor((Date.now() - b.startedAt) / 1000) : 0, tm = U.pad(Math.floor(secs / 60)) + ':' + U.pad(secs % 60);
      const html = C.topbar({ title: voice ? 'Voice call' : 'Video call', sub: svc.name, back }) +
        '<div class="card" style="background:#0F1A2B;color:#fff;text-align:center;padding:30px 18px"><div style="display:flex;justify-content:center">' + U.avatar(pro.name, 96, inCall) + '</div><h2 style="margin-top:12px">' + esc(pro.name) + '</h2>' +
        '<p style="opacity:.8;margin-top:4px">' + (inCall ? 'In call · ' + tm : b.status === 'confirmed' ? 'Waiting for ' + esc(U.firstName(pro.name)) + ' to start the call' : 'Call ended') + '</p>' +
        (inCall ? '<div class="row" style="justify-content:center;margin-top:16px;gap:14px"><span class="icon-btn" style="background:rgba(255,255,255,.14);color:#fff;box-shadow:none">' + I('phone') + '</span><span class="icon-btn" style="background:var(--err);color:#fff;box-shadow:none">' + I('close') + '</span></div>' : '') + '</div>' +
        C.simNote('Prototype: no real audio or video. The professional starts the call from their app, and this screen updates live.') +
        '<div class="card mt-3"><b>Weak signal?</b><p class="muted small mt-1">Video uses a lot of data. Switch to a voice call, or ask the professional to call your phone.</p>' + C.toggle({ label: 'Use voice call (low data)', on: voice, act: 'call.voice' }) + '</div>' +
        '<button class="btn secondary block mt-3" data-act="nav" data-v="/chat/' + b.id + '">' + I('chat', 'sm') + 'Message ' + esc(U.firstName(pro.name)) + '</button>';
      return { html, tab: 'bookings', title: 'Call', onMount() { BV.Router.interval(() => BV.Router.refresh(), 1000); } };
    }

    const en = b.status === 'en_route', eta = en ? b.travel.startedAt + b.travel.etaMin * 60000 : 0, prog = en ? U.clamp((Date.now() - b.travel.startedAt) / (b.travel.etaMin * 60000), 0.04, 0.97) : (b.status === 'confirmed' ? 0 : 1);
    const head = b.status === 'confirmed' ? ['Not set off yet', 'You will be notified when ' + U.firstName(pro.name) + ' leaves.'] : en ? [eta > Date.now() ? 'About ' + U.until(eta) : 'Arriving now', U.firstName(pro.name) + ' is on the way'] : [b.status === 'in_progress' ? 'Here' : 'Done', b.status === 'in_progress' ? U.firstName(pro.name) + ' arrived at ' + U.clock(b.startedAt) : 'Visit finished'];
    const html = C.topbar({ title: 'Live visit', sub: svc.name, back }) + mapSvg() +
      '<div class="card"><div class="big-eta">' + esc(head[0]) + '</div><p class="muted mt-1">' + esc(head[1]) + '</p></div>' +
      '<div class="card" style="display:flex;gap:12px;align-items:center">' + U.avatar(pro.name, 52, b.model === 'managed') + '<div class="grow"><b>' + esc(pro.name) + '</b><div class="muted small">' + esc(pro.title.replace(' · BUSHEMI Care Team', '')) + '</div>' + C.badgeModel(b.model, true) + '</div><button class="icon-btn" data-act="nav" data-v="/chat/' + b.id + '" aria-label="Message">' + I('chat') + '</button></div>' +
      '<div class="card flat"><b>' + esc(b.address.label) + ', ' + esc(b.address.area) + '</b><div class="muted small">' + esc(b.address.line) + ' · ' + esc(b.address.landmark) + '</div></div>' +
      C.simNote('Illustrative route. The estimated time comes from the professional\'s app; live GPS tracking is planned for a later version.');
    return { html, tab: 'bookings', title: 'Live visit', onMount() {
      BV.Router.interval(() => BV.Router.refresh(), 15000);
      const path = U.$('#route'), mk = U.$('#marker'); if (path && mk) { const pt2 = path.getPointAtLength(path.getTotalLength() * prog); mk.setAttribute('transform', 'translate(' + pt2.x + ',' + pt2.y + ')'); }
    } };
  }
  BV.act('call.voice', () => { D.set('call.voice', !D.get('call.voice', false)); BV.Router.refresh(); });

  /* ======================= RECEIPT ======================= */
  function receipt(p) {
    const s = BV.state(), b = BV.booking.byId(s, p.params.id);
    if (!b || b.household !== pt.hh().id) return BV.shared.notFound();
    const svc = BV.svc(b.service), pro = b.pro && s.pros.find(x => x.id === b.pro), r = s.recipients.find(x => x.id === b.recipient);
    const html = C.topbar({ title: 'Receipt', sub: 'Ref ' + b.ref, back: '/booking/' + b.id }) +
      '<div class="card"><div class="center"><span class="brand-lockup" style="justify-content:center">' + C.MARK + 'BUSHEMI</span><p class="muted small mt-1">Receipt · ' + esc(U.relDay(U.dkey(new Date(b.createdAt)))) + '</p></div><div class="mt-4">' +
      C.kv('Service', esc(svc.name)) + C.kv('For', esc(r.name)) + C.kv('Date', esc(U.when(b.date, b.time))) + C.kv('Provided by', pro ? esc(pro.name) : 'BUSHEMI Care Team') + C.kv('Type', b.model === 'managed' ? 'BUSHEMI-managed service' : 'Independent professional') + '</div>' +
      '<div class="mt-3">' + C.priceLines(b.price) + '</div><div class="mt-3">' + C.kv('Payment', esc(C.paymentLabel(b))) + '</div></div>' +
      C.simNote('Prototype receipt. This is not a tax invoice and no real payment was made.') +
      '<button class="btn secondary block mt-3" data-act="print">' + I('file', 'sm') + 'Print or save as PDF</button>';
    return { html, tab: 'bookings', title: 'Receipt' };
  }
  BV.act('print', () => window.print());

  BV.proute('/book', book);
  BV.proute('/bookings', bookings);
  BV.proute('/booking/:id', booking);
  BV.proute('/booking/:id/track', track);
  BV.proute('/booking/:id/receipt', receipt);
})(window.BV);
