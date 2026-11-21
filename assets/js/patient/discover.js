/* BUSHEMI v3 · patient/discover.js
   Home, finding care, comparing, and reading a professional's profile.
   The managed vs independent choice is presented honestly at every step. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pt = BV.pt;

  const svcTile = s => '<button class="svc-tile" data-act="nav" data-v="/service/' + s.id + '"><span class="ic-tile ' + s.tone + '">' + I(s.icon) + '</span><span><b>' + esc(s.name) + '</b><small>' + (s.managedOnly ? 'Assessment first' : 'From ' + U.money(s.managedPrice || s.rateRange[0])) + (s.mode === 'video' ? ' · video' : '') + '</small></span></button>';

  /* ============ HOME ============ */
  function home() {
    const s = BV.state(), hh = pt.hh(), bs = BV.booking.forHousehold(s, hh.id);
    const unread = BV.notif.unread(s, 'patient', hh.id);
    const live = bs.find(b => ['en_route', 'in_progress'].includes(b.status));
    const upcoming = bs.filter(b => BV.booking.isOpen(b) && b !== live);
    const next = upcoming.find(b => b.time || b.window) || upcoming[0];
    const todo = pt.todo();
    const viewOnly = !pt.canBook();

    let hero;
    if (live) {
      const p = live.pro && s.pros.find(x => x.id === live.pro), r = s.recipients.find(x => x.id === live.recipient);
      const eta = live.status === 'en_route' && live.travel ? live.travel.startedAt + live.travel.etaMin * 60000 : 0;
      hero = '<section class="hero green" aria-label="Visit happening now"><span class="tag">' + I('pulse', 'sm') + (live.status === 'en_route' ? 'On the way' : 'Happening now') + '</span>' +
        '<h2 style="margin-top:10px">' + (live.status === 'en_route' ? esc(U.firstName(p.name)) + ' is heading to ' + esc(U.firstName(r.name)) : 'Visit in progress for ' + esc(U.firstName(r.name))) + '</h2>' +
        (live.status === 'en_route' ? '<div class="eta">' + (eta > Date.now() ? 'About ' + U.until(eta) : 'Arriving now') + '</div>' : '<p>' + esc(BV.svc(live.service).name) + ' with ' + esc(p.name) + '</p>') +
        '<div class="row-b"><button class="btn" data-act="nav" data-v="/booking/' + live.id + '/track">' + I(live.mode === 'video' ? 'video' : 'map', 'sm') + (live.mode === 'video' ? 'Open call' : 'Track visit') + '</button><button class="btn glass" data-act="nav" data-v="/chat/' + live.id + '">' + I('chat', 'sm') + 'Message</button></div></section>';
    } else if (next) {
      const svc = BV.svc(next.service), r = s.recipients.find(x => x.id === next.recipient), p = next.pro && s.pros.find(x => x.id === next.pro);
      const st = BV.booking.info(next);
      hero = '<section class="hero" aria-label="Your next visit"><span class="tag">' + I('cal', 'sm') + 'Next visit</span><h2 style="margin-top:10px">' + esc(svc.name) + '</h2>' +
        '<p>' + esc(U.when(next.date, next.time || (next.window && BV.avail.SHIFTS[next.window].label.toLowerCase()))) + ' · for ' + esc(U.firstName(r.name)) + (p ? ' · with ' + esc(p.name) : '') + '</p>' +
        '<p style="margin-top:8px"><span class="tag">' + esc(st.label) + '</span> <span class="tag">' + (next.model === 'managed' ? 'BUSHEMI Care Team' : 'Independent') + '</span></p>' +
        '<div class="row-b"><button class="btn" data-act="nav" data-v="/booking/' + next.id + '">View booking</button></div></section>';
    } else {
      hero = '<section class="hero"><span class="tag">' + I('heart', 'sm') + 'Care at home</span><h2 style="margin-top:10px">Trusted care, where your family is</h2><p>Nurses, caregivers, midwives and therapists, checked by BUSHEMI.</p><div class="row-b"><button class="btn" data-act="nav" data-v="/find">Find care</button></div></section>';
    }

    const todoCards = todo.slice(0, 3).map(t => {
      const svc = BV.svc(t.b.service), p = t.b.pro && s.pros.find(x => x.id === t.b.pro);
      if (t.type === 'review') return '<button class="card clickable list-row" style="border:0;padding:14px" data-act="nav" data-v="/booking/' + t.b.id + '?review=1"><span class="ic-tile amber">' + I('star') + '</span><span class="grow"><b>How was ' + esc(U.firstName(p.name)) + '\'s visit?</b><small>Your review helps other families. It takes 20 seconds.</small></span>' + I('chev', 'chev') + '</button>';
      if (t.type === 'pay') return '<button class="card clickable list-row" style="border:0;padding:14px" data-act="nav" data-v="/booking/' + t.b.id + '"><span class="ic-tile amber">' + I('wallet') + '</span><span class="grow"><b>Payment due: ' + U.money(t.b.price.total) + '</b><small>' + esc(svc.name) + ' · pay after the visit</small></span>' + I('chev', 'chev') + '</button>';
      return '<button class="card warn clickable list-row" style="border:0;padding:14px" data-act="nav" data-v="/booking/' + t.b.id + '"><span class="ic-tile amber">' + I('alert') + '</span><span class="grow"><b>' + esc(svc.name) + ' needs a new plan</b><small>' + esc(BV.booking.info(t.b).label) + '. Tap to find another option.</small></span>' + I('chev', 'chev') + '</button>';
    }).join('');

    const cur = pt.cur(), dues = cur ? pt.dueMeds(cur) : [], left = dues.filter(d => !d.done);
    const medCard = cur && cur.meds.length ? '<button class="card clickable list-row" style="border:0;padding:14px" data-act="nav" data-v="/care/meds"><span class="ic-tile green">' + I('pill') + '</span><span class="grow"><b>' + (left.length ? left.length + ' ' + U.plural(left.length, 'medicine') + ' left today' : 'All medicines done today') + '</b><small>' + esc(cur.name) + (left[0] ? ' · next at ' + left[0].time : '') + '</small></span>' + I('chev', 'chev') + '</button>' : '';

    const html =
      '<div class="hello"><div><small>' + pt.greeting() + '</small><h1>' + esc(pt.firstName()) + '</h1></div><div class="row">' +
      '<button class="icon-btn" data-act="nav" data-v="/notifications" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + I('bell') + (unread ? '<i class="badge-dot"></i>' : '') + '</button>' +
      '<button class="icon-btn" data-act="nav" data-v="/account" aria-label="Account">' + I('user') + '</button></div></div>' +
      (viewOnly ? '<div class="callout warn mt-2">' + I('lock', 'sm') + '<span><b>View only</b>You can follow updates for the family. Ask the account owner for booking access.</span></div>' : '') +
      hero + (todoCards ? '<div class="stack mt-3">' + todoCards + '</div>' : '') + (medCard ? '<div class="mt-3">' + medCard + '</div>' : '') +
      C.section('What do you need?', 'See all', 'nav', '/find') +
      '<div class="svc-strip">' + BV.data.services.slice(0, 8).map(s2 => '<button class="svc-mini" data-act="nav" data-v="/service/' + s2.id + '"><span class="ic-tile ' + s2.tone + '">' + I(s2.icon) + '</span>' + esc(s2.short) + '</button>').join('') + '</div>' +
      C.section('Two ways to get care') +
      '<div class="model-pick">' +
      '<div class="model-card managed"><h3>' + C.badgeModel('managed') + '</h3><p>We choose, schedule and manage a checked professional for you. One all-inclusive price, and we step in if plans change.</p></div>' +
      '<div class="model-card"><h3>' + C.badgeModel('independent') + '</h3><p>Browse verified independent professionals, compare, and book the one you prefer. They set their own prices.</p></div>' +
      '<button class="link" data-act="nav" data-v="/trust" style="text-align:left">How BUSHEMI keeps you safe →</button></div>' +
      (upcoming.length > 1 ? C.section('Coming up', 'All visits', 'nav', '/bookings') + upcoming.filter(b => b !== next).slice(0, 2).map(bookingCard).join('') : '') +
      '<div class="callout warn mt-4">' + I('alert', 'sm') + '<span><b>In an emergency, call ' + BV.config.emergencyNumber + '.</b>BUSHEMI visits are for planned care, not emergencies.</span></div>';
    return { html, tab: 'home', title: 'Home' };
  }

  /* shared by Home and Bookings */
  function bookingCard(b) {
    const s = BV.state(), svc = BV.svc(b.service), r = s.recipients.find(x => x.id === b.recipient), p = b.pro && s.pros.find(x => x.id === b.pro), d = U.parseKey(b.date);
    const who = p ? p.name : (b.model === 'managed' ? 'BUSHEMI Care Team' : 'Professional');
    const when = b.time || (b.window ? BV.avail.SHIFTS[b.window].label : '');
    return '<article class="card clickable bk-card" data-act="nav" data-v="/booking/' + b.id + '" role="button" tabindex="0" aria-label="' + esc(svc.name) + ', ' + esc(U.relDay(b.date)) + '"><div class="bk-top"><span class="date-tile">' + d.getDate() + '<small>' + U.MON[d.getMonth()].toUpperCase() + '</small></span>' +
      '<div class="grow"><b>' + esc(svc.name) + '</b><div class="muted small">' + esc(U.relDay(b.date) + (when ? ' · ' + when : '')) + '</div><div class="muted small">For ' + esc(U.firstName(r.name)) + ' · ' + esc(who) + '</div></div>' + C.statusPill(b, 'patient') + '</div>' +
      '<div class="row wrap">' + C.badgeModel(b.model, true) + (b.mode === 'video' ? '<span class="badge neutral">' + I('video', 'sm') + 'Video</span>' : '') + (b.change ? '<span class="badge warn">New time requested</span>' : '') + '</div></article>';
  }
  BV.pt.bookingCard = bookingCard;

  /* ============ FIND ============ */
  function find() {
    const q = String(BV.Draft.get('find.q', '')).trim().toLowerCase(), s = BV.state();
    let body;
    if (q) {
      const svcs = BV.data.services.filter(x => (x.name + ' ' + x.desc + ' ' + x.short).toLowerCase().includes(q));
      const pros = s.pros.filter(p => p.verification.status === 'verified' && (p.name + ' ' + p.title + ' ' + p.specialties.join(' ') + ' ' + p.areas.join(' ')).toLowerCase().includes(q));
      body = (svcs.length ? C.section('Services') + '<div class="svc-grid">' + svcs.map(svcTile).join('') + '</div>' : '') +
        (pros.length ? C.section('Professionals') + pros.map(p => C.provCard(p)).join('') : '') +
        (!svcs.length && !pros.length ? C.empty('search', 'Nothing found for "' + BV.Draft.get('find.q', '') + '"', 'Try a service like "nurse" or a condition like "diabetes".') : '');
    } else {
      const top = s.pros.filter(p => p.verification.status === 'verified' && p.model === 'independent').sort((a, b) => BV.rules.rating(b).rating - BV.rules.rating(a).rating).slice(0, 3);
      body = '<div class="svc-grid mt-3">' + BV.data.services.map(svcTile).join('') + '</div>' +
        C.section('Top rated independent professionals') + top.map(p => C.provCard(p)).join('') +
        '<div class="card tint mt-3"><div class="row"><span class="ic-tile">' + I('phone') + '</span><div class="grow"><b>Prefer to talk?</b><div class="muted small">The care team can arrange care by phone. Useful if data is slow.</div></div></div><div class="mt-3">' + C.callBtn('Call the care team', 'secondary block') + '</div></div>';
    }
    const html = C.topbar({ title: 'Find care', sub: 'Serving ' + pt.area() + ' and nearby', back: false, right: '<button class="icon-btn" data-act="area.pick" aria-label="Change area: ' + esc(pt.area()) + '">' + I('pin') + '</button>' }) +
      '<div class="field" style="margin:4px 0 0"><input class="input" id="find-q" type="search" placeholder="Search nurse, diabetes, physio…" aria-label="Search" value="' + esc(BV.Draft.get('find.q', '')) + '" data-draft="find.q" data-on-input="find.q" autocomplete="off"></div>' + body;
    return { html, tab: 'find', title: 'Find care' };
  }
  BV.act('find.q', () => BV.Router.refresh());

  BV.act('area.pick', () => {
    BV.UI.sheet('<h2>Where is the care needed?</h2><p class="muted small mt-1">We show professionals who cover this area. Video consultations work from anywhere.</p><div class="chips mt-3">' +
      BV.data.areas.map(a => '<button class="chip' + (a === pt.area() ? ' on' : '') + '" data-act="area.set" data-v="' + esc(a) + '">' + esc(a) + '</button>').join('') + '</div>', { label: 'Choose area' });
  });
  BV.act('area.set', v => { BV.Session.set('area', v); BV.UI.closeSheet(); BV.Router.refresh(); });

  /* ============ SERVICE ============ */
  function service(p) {
    const svc = BV.svc(p.params.id), s = BV.state();
    if (!svc) return BV.shared.notFound();
    const area = pt.area(), sort = BV.Draft.get('svc.sort', 'recommended'), cmp = BV.Draft.get('cmp.' + svc.id, []);
    const managedOk = svc.managedPrice != null && (svc.mode === 'video' || BV.data.managedCoverage.includes(area));
    const nextM = managedOk ? BV.avail.nextManaged(svc, area, s) : null;
    let pros = s.pros.filter(x => x.model === 'independent' && x.verification.status === 'verified' && BV.match.offers(x, svc.id) && BV.match.covers(x, area, svc))
      .map(x => ({ pro: x, rating: BV.rules.rating(x, s).rating, rate: BV.pricing.rateOf(x, svc.id), next: BV.avail.nextAvailable(x, svc, s) }));
    const sorters = {
      recommended: (a, b) => (b.rating * 10 - (b.next ? 0 : 20)) - (a.rating * 10 - (a.next ? 0 : 20)),
      price: (a, b) => a.rate - b.rate, rating: (a, b) => b.rating - a.rating,
      soonest: (a, b) => (a.next ? BV.avail.startTs({ date: a.next.date, time: a.next.time }) : 9e15) - (b.next ? BV.avail.startTs({ date: b.next.date, time: b.next.time }) : 9e15)
    };
    pros.sort(sorters[sort]);
    const fee = BV.config.fees.independentServicePct;
    const managedCard = svc.managedPrice != null ? (managedOk ?
      '<div class="model-card managed"><h3>' + C.badgeModel('managed') + '</h3><p>We match and manage a verified professional. ' + (svc.mode === 'plan' ? 'We start with a free assessment call.' : 'You choose the day and time window.') + '</p>' +
      '<div class="between"><div><b style="font-size:1.25rem">' + (svc.mode === 'plan' ? 'From ' : '') + U.money(svc.managedPrice) + '</b><small class="muted"> ' + (svc.mode === 'plan' ? 'per day, set after assessment' : 'all-inclusive') + '</small>' + (nextM ? '<div class="small ok-text" style="margin-top:2px">' + I('clock', 'sm') + ' Next: ' + U.relDay(nextM.date) + ', ' + BV.avail.SHIFTS[nextM.window].label.toLowerCase() + '</div>' : '') + '</div>' +
      '<button class="btn green" data-act="book.start" data-v="managed|' + svc.id + '">' + (svc.mode === 'plan' ? 'Request assessment' : 'Book with BUSHEMI') + '</button></div></div>' :
      '<div class="callout">' + I('info', 'sm') + '<span><b>Managed care is not available in ' + esc(area) + ' yet</b>The BUSHEMI Care Team currently covers Lusaka areas like Chalala, Kabulonga and Woodlands. <button class="link" data-act="area.pick">Change area</button></span></div>')
      : '<div class="callout">' + I('info', 'sm') + '<span><b>Independent professionals only</b>This service is currently offered by independent professionals on BUSHEMI.</span></div>';
    const html =
      C.topbar({ title: svc.name, sub: svc.duration ? svc.duration + ' min' + (svc.mode === 'video' ? ' · video or voice call' : ' · at home') : 'Ongoing care', back: '/find' }) +
      '<p class="muted">' + esc(svc.desc) + '</p>' +
      '<div class="card flat mt-3"><b>What is included</b><ul class="facts mt-2">' + svc.includes.map(x => '<li>' + I('check', 'sm') + '<div><span style="color:var(--ink);font-size:.92rem">' + esc(x) + '</span></div></li>').join('') + '</ul><p class="muted small mt-3"><b>Good to have ready:</b> ' + esc(svc.bring) + '</p></div>' +
      C.section('Choose how to book') + '<div class="model-pick">' + managedCard + '</div>' +
      (svc.managedOnly ? '' :
        '<div class="between" style="margin:22px 0 8px"><h2>Independent professionals</h2><button class="link" data-act="area.pick">' + I('pin', 'sm') + ' ' + esc(area) + '</button></div>' +
        '<p class="muted small" style="margin-bottom:10px">You choose. Each sets their own rate. A ' + fee + '% BUSHEMI service fee covers verification, secure payment holds and support.</p>' +
        '<div class="chips scroll">' + [['recommended', 'Recommended'], ['soonest', 'Soonest'], ['price', 'Lowest price'], ['rating', 'Top rated']].map(x => '<button class="chip' + (sort === x[0] ? ' on' : '') + '" data-act="svc.sort" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div><div class="mt-3"></div>' +
        (pros.length ? pros.map(x => C.provCard(x.pro, { svc, next: x.next, compare: { on: cmp.includes(x.pro.id) } })).join('') :
          C.empty('users', 'No independent professionals in ' + area + ' yet', 'Try a nearby area, or book with the BUSHEMI Care Team.', { label: 'Change area', act: 'area.pick' }))) +
      (cmp.length >= 2 ? '<div class="cmp-bar"><span><b>' + cmp.length + '</b> selected</span><button class="btn primary sm" data-act="nav" data-v="/compare?svc=' + svc.id + '&ids=' + cmp.join(',') + '">Compare</button></div>' : '');
    return { html, cls: cmp.length >= 2 ? 'hasbar' : '', tab: 'find', title: svc.name };
  }
  BV.act('svc.sort', v => { BV.Draft.set('svc.sort', v); BV.Router.refresh(); });
  BV.act('cmp.toggle', (v, el) => {
    const sid = BV.Router.cur.params.id, cur = BV.Draft.get('cmp.' + sid, []).slice();
    const i = cur.indexOf(v);
    if (i > -1) cur.splice(i, 1); else if (cur.length >= 3) { BV.UI.toast('Compare up to 3 professionals'); el.checked = false; return; } else cur.push(v);
    BV.Draft.set('cmp.' + sid, cur); BV.Router.refresh();
  });

  /* ============ COMPARE ============ */
  function compare(p) {
    const s = BV.state(), svc = BV.svc(p.query.svc), ids = (p.query.ids || '').split(',').filter(Boolean);
    const pros = ids.map(i => s.pros.find(x => x.id === i)).filter(Boolean);
    if (!svc || pros.length < 2) return { html: C.topbar({ title: 'Compare', back: '/find' }) + C.empty('layers', 'Pick at least two professionals', 'Tick "Compare" on two or three professionals to see them side by side.', { label: 'Back to find care', act: 'nav', v: '/find' }), tab: 'find' };
    const row = (label, fn) => '<tr><th scope="row">' + label + '</th>' + pros.map(x => '<td>' + fn(x) + '</td>').join('') + '</tr>';
    const html = C.topbar({ title: 'Compare', sub: svc.name, back: '/service/' + svc.id }) +
      '<div class="card" style="padding:8px 10px;overflow-x:auto"><table class="cmp-table"><thead><tr><th></th>' + pros.map(x => '<th scope="col">' + U.avatar(x.name, 38) + '<div style="margin-top:6px">' + esc(U.firstName(x.name)) + '</div></th>').join('') + '</tr></thead><tbody>' +
      row('Type', x => C.badgeModel(x.model, true)) +
      row('Rating', x => { const r = BV.rules.rating(x, s); return C.stars(r.rating) + '<br><small class="muted">' + r.count + ' reviews</small>'; }) +
      row('Price', x => '<b>' + U.money(BV.pricing.rateOf(x, svc.id)) + '</b><br><small class="muted">+ ' + U.money(Math.round(BV.pricing.rateOf(x, svc.id) * BV.config.fees.independentServicePct / 100)) + ' fee</small>') +
      row('Total', x => { const q = BV.pricing.quote({ service: svc, model: 'independent', pro: x }); return '<b>' + U.money(q.total) + '</b>'; }) +
      row('Next free', x => { const n = BV.avail.nextAvailable(x, svc, s); return n ? U.when(n.date, n.time) : '<span class="muted">None soon</span>'; }) +
      row('Experience', x => x.years + ' years') +
      row('Replies in', x => '~' + x.stats.responseMin + ' min') +
      row('Visits done', x => x.stats.visits) +
      row('Speaks', x => esc(x.languages.join(', '))) +
      row('Verified', x => BV.verify.summary(x).passed + ' of ' + BV.verify.summary(x).total + ' checks') +
      '<tr><th></th>' + pros.map(x => '<td><button class="btn primary sm block" data-act="book.start" data-v="independent|' + svc.id + '|' + x.id + '">Book</button><button class="link" data-act="nav" data-v="/pro/' + x.id + '?svc=' + svc.id + '" style="margin-top:6px">Profile</button></td>').join('') + '</tr></tbody></table></div>' +
      '<p class="muted small mt-3">Prices are the professional\'s own rate plus BUSHEMI\'s ' + BV.config.fees.independentServicePct + '% service fee. Compare with the all-inclusive <a href="#/service/' + svc.id + '">BUSHEMI-managed price</a>' + (svc.managedPrice ? ' of ' + U.money(svc.managedPrice) : '') + '.</p>';
    return { html, tab: 'find', title: 'Compare' };
  }

  /* ============ PROFESSIONAL PROFILE ============ */
  function proProfile(p) {
    const s = BV.state(), pro = s.pros.find(x => x.id === p.params.id);
    if (!pro) return BV.shared.notFound();
    const svcId = p.query.svc && BV.match.offers(pro, p.query.svc) ? p.query.svc : pro.services[0].id, svc = BV.svc(svcId);
    const r = BV.rules.rating(pro, s), v = BV.verify.summary(pro), t = BV.data.proTypes[pro.type];
    const managed = pro.model === 'managed';
    const ids = BV.verify.checksFor(pro);
    const vlist = ids.map(id => {
      const c = pro.verification.checks[id], lab = BV.verify.label(pro, id), ok = c && c.status === 'passed';
      const soon = ok && c.expires && c.expires - Date.now() < 60 * 86400000;
      return '<div class="verify-item' + (soon ? ' warn' : '') + '">' + I(ok ? 'shieldcheck' : 'clock') + '<div><b>' + esc(lab[0]) + '</b><small>' + esc(lab[1]) + (ok ? ' · checked ' + U.MON[new Date(c.date).getMonth()] + ' ' + new Date(c.date).getFullYear() : ' · pending') + (c && c.number ? ' · ' + esc(c.number) : '') + '</small></div></div>';
    }).join('');
    const days = [0, 1, 2, 3, 4].map(n => { const dk = U.dkey(U.addDays(U.today(), n)); return { dk, n: BV.avail.freeCount(pro, svc, dk, s) }; });
    const revs = BV.rules.reviewList(pro, s).slice(0, 3);
    const home = managed ? '/find' : '/service/' + svcId;
    const roleInfo = managed
      ? '<div class="callout ok">' + I('shieldcheck', 'sm') + '<span><b>Part of the BUSHEMI Care Team</b>BUSHEMI assigns this professional and is responsible for the service, follow-up and a replacement if needed.</span></div>'
      : '<div class="callout" style="background:var(--indep-bg);color:var(--indep)">' + I('user', 'sm') + '<span><b>Independent professional</b>They run their own practice and set their own rate. BUSHEMI verifies them and holds your payment until they accept.</span></div>';
    const bar = managed
      ? '<div class="book-bar"><div class="grow"><small>Managed by BUSHEMI</small><b>' + U.money(svc.managedPrice) + '</b></div><button class="btn green" data-act="book.start" data-v="managed|' + svc.id + '">Book with BUSHEMI</button></div>'
      : '<div class="book-bar"><div class="grow"><small>' + esc(svc.name) + ' · ' + U.money(BV.pricing.rateOf(pro, svcId)) + ' + fee</small><b>' + U.money(BV.pricing.quote({ service: svc, model: 'independent', pro }).total) + '</b></div><button class="btn primary" data-act="book.start" data-v="independent|' + svc.id + '|' + pro.id + '"' + (v.status !== 'verified' ? ' disabled' : '') + '>Choose a time</button></div>';
    const html =
      '<div class="pro-hero ' + (managed ? 'green' : '') + '">' + C.topbar({ title: '', back: home }).replace('<h1 class="topbar-title"></h1>', '') + '</div>' +
      '<div class="pro-id">' + U.avatar(pro.name, 92, managed) + '<h1>' + esc(pro.name) + '</h1><p class="muted">' + esc(pro.title) + '</p>' +
      '<div class="row wrap mt-2" style="justify-content:center">' + C.badgeModel(pro.model) + C.verifyBadge(pro) + '</div></div>' +
      '<div class="stats">' + C.stat(r.rating ? r.rating.toFixed(1) + ' ★' : 'New', r.count + ' reviews') + C.stat(pro.years + ' yrs', 'experience') + C.stat(pro.stats.visits, 'visits') + '</div>' +
      roleInfo +
      C.section('About') + '<p>' + esc(pro.bio) + '</p>' +
      '<div class="chips mt-3">' + pro.specialties.map(x => '<span class="badge neutral">' + esc(x) + '</span>').join('') + '</div>' +
      '<p class="muted small mt-3">' + I('pin', 'sm') + ' ' + (svc.mode === 'video' ? 'Video and voice calls' : esc(pro.areas.join(', '))) + '<br>Speaks ' + esc(pro.languages.join(', ')) + ' · usually replies in ' + pro.stats.responseMin + ' min</p>' +
      (pro.services.length > 1 ? C.section('Services') + '<div class="chips">' + pro.services.map(x => '<button class="chip' + (x.id === svcId ? ' on' : '') + '" data-act="nav" data-v="/pro/' + pro.id + '?svc=' + x.id + '">' + esc(BV.svc(x.id).short) + ' · ' + (managed ? U.money(BV.svc(x.id).managedPrice) : U.money(x.rate)) + '</button>').join('') + '</div>' : '') +
      C.section('Availability') + '<div class="card flat"><div class="chips">' + days.map(d => '<span class="badge ' + (d.n ? 'ok' : 'neutral') + '">' + esc(U.relDay(d.dk)) + ': ' + (d.n ? d.n + ' free' : 'full') + '</span>').join('') + '</div><p class="muted small mt-2">Choose an exact time in the next step.</p></div>' +
      C.section('Why you can trust this professional') +
      '<div class="card"><div class="between"><b>' + v.passed + ' of ' + v.total + ' checks passed</b>' + C.verifyBadge(pro) + '</div><div class="pbar mt-2"><i style="width:' + Math.round(v.passed / v.total * 100) + '%"></i></div><div class="verify-list mt-3">' + vlist + '</div>' +
      '<p class="muted small mt-3">' + (t.regulator ? 'Registered with the ' + esc(t.regulatorName) + '. ' : '') + 'BUSHEMI checks records when a professional joins and re-checks them before they expire. <button class="link" data-act="nav" data-v="/trust">How we verify</button></p>' +
      (v.expiring ? '<div class="callout warn mt-2">' + I('clock', 'sm') + '<span>One document is due for renewal soon. The professional has been reminded.</span></div>' : '') +
      '<p class="sim-note">' + I('info', 'sm') + '<span>Registration numbers in this prototype are fictional demo values.</span></p></div>' +
      C.section('Reviews') + revs.map(x => '<div class="card flat"><div class="between"><b>' + esc(x.name) + '</b>' + C.stars(x.rating) + '</div><p class="mt-1">' + esc(x.text) + '</p><small class="muted">' + U.ago(x.ts) + (x.fresh ? '' : ' · demo review') + '</small></div>').join('') +
      '<p class="muted small">Only families who completed a booked visit can leave a review.</p>' + bar;
    return { html, cls: 'hasbar', tab: 'find', title: pro.name };
  }

  BV.route('/', ctx => pt.hh() ? home(ctx) : pt.redirect('/welcome'));
  BV.proute('/find', find);
  BV.proute('/service/:id', service);
  BV.proute('/compare', compare);
  BV.proute('/pro/:id', proProfile);
  BV.route('/404', BV.shared.notFound);
})(window.BV);
