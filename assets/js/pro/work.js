/* BUSHEMI v3 · pro/work.js
   The professional's working screens: Today, Requests, Request/Visit detail, Visit report, Schedule, Availability.
   Principles: the next action is always one tap away; patient details are shared only as far as the
   booking state allows; every action writes the same shared record the patient sees. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pr = BV.pr, D = BV.Draft, SH = () => BV.avail.SHIFTS;
  const svcOf = b => BV.svc(b.service);
  const whenTxt = b => U.when(b.date, b.time || (b.window ? SH()[b.window].label.toLowerCase() + ' window' : ''));
  const recOf = (b, s) => (s || BV.state()).recipients.find(r => r.id === b.recipient);
  const pay = b => U.money(b.price.proPayout);
  const typeIcon = b => BV.svc(b.service).icon;

  /* ---------- primary action for a job, by status ---------- */
  function jobAction(b, big) {
    const v = b.mode === 'video', cls = 'btn primary' + (big ? ' block' : '');
    if (b.status === 'confirmed') return '<button class="' + cls + '" data-act="' + (v ? 'job.start' : 'job.travel') + '" data-v="' + b.id + '">' + I(v ? 'video' : 'run', 'sm') + (v ? 'Start call' : 'I am on my way') + '</button>';
    if (b.status === 'en_route') return '<button class="' + cls + '" data-act="job.start" data-v="' + b.id + '">' + I('check', 'sm') + 'I have arrived · start visit</button>';
    if (b.status === 'in_progress') return '<button class="' + cls + '" data-act="job.end" data-v="' + b.id + '">' + I('flag', 'sm') + (v ? 'End call' : 'End visit') + '</button>';
    if (b.status === 'report_due') return '<button class="' + cls + '" data-act="nav" data-v="/report/' + b.id + '">' + I('clipboard', 'sm') + 'Write visit report</button>';
    return '';
  }
  BV.act('job.travel', v => {
    BV.UI.sheet('<h2>Set off for the visit</h2><p class="muted small mt-1">The family is told you are on the way and sees your estimated arrival.</p><div class="lab mt-4">How long will it take?</div>' +
      C.choice([['8', '8 min'], ['15', '15 min'], ['25', '25 min'], ['40', '40 min']], D.get('eta', '15'), 'job.eta') + '<button class="btn primary block mt-4" data-act="job.go" data-v="' + v + '">' + I('run', 'sm') + 'Set off</button>', { label: 'Set off' });
  });
  BV.act('job.eta', v => { D.set('eta', v); BV.acts['job.travel'](BV.Router.cur.params.id || ''); });
  BV.act('job.go', v => {
    const id = v || BV.Router.cur.params.id; BV.booking.startTravel(id, pr.me().id, +D.get('eta', '15')); BV.UI.closeSheet(); BV.UI.toast('The family has been told you are on the way');
  });
  BV.act('job.start', v => { BV.booking.startVisit(v, pr.me().id); BV.UI.toast('Visit started'); });
  BV.act('job.end', v => BV.UI.confirm({ title: 'End the visit?', text: 'You will write a short report next. It is part of the care record.', yes: 'End and write report', onYes: () => { BV.booking.endVisit(v, pr.me().id); BV.Router.go('/report/' + v); } }));

  /* ---------- cards ---------- */
  function reqCard(b, s) {
    const r = recOf(b, s), svc = svcOf(b), left = b.expiresAt ? b.expiresAt - Date.now() : 0, urgent = b.status === 'requested' && left < 45 * 60000;
    return '<article class="req-card' + (urgent ? ' urgent' : '') + '"><div class="req-head" data-act="nav" data-v="/request/' + b.id + '" role="button" tabindex="0" style="cursor:pointer"><div><b>' + esc(svc.name) + '</b><div class="muted small">' + esc(U.firstName(r.name)) + (r.age ? ', ' + r.age : '') + ' · ' + esc(r.relation) + '</div></div><div class="req-pay"><b>' + pay(b) + '</b><small>you earn</small></div></div>' +
      '<div class="meta-row"><span>' + I('cal', 'sm') + esc(whenTxt(b)) + '</span><span>' + I(b.mode === 'video' ? 'video' : 'pin', 'sm') + esc(b.mode === 'video' ? 'Video call' : b.address.area) + '</span>' + (b.status === 'requested' ? '<span class="timer">' + I('clock', 'sm') + 'Reply within ' + U.until(b.expiresAt) + '</span>' : '') + '</div>' +
      (b.notes ? '<p class="small muted">“' + esc(b.notes.length > 90 ? b.notes.slice(0, 90) + '…' : b.notes) + '”</p>' : '') +
      (b.status === 'requested' ? '<div class="btn-pair"><button class="btn secondary" data-act="req.decline" data-v="' + b.id + '">Decline</button><button class="btn primary" data-act="req.accept" data-v="' + b.id + '">Accept</button></div>' : '') + '</article>';
  }
  function apptRow(b, s) {
    const r = recOf(b, s), svc = svcOf(b), st = BV.booking.info(b, 'pro');
    return '<button class="appt" data-act="nav" data-v="/request/' + b.id + '"><span class="t">' + (b.time || SH()[b.window].from) + '<small>' + (b.mode === 'video' ? 'video' : (svc.duration + ' min')) + '</small></span><span class="m"><b>' + esc(svc.short) + ' · ' + esc(U.firstName(r.name)) + '</b><small>' + esc(b.mode === 'video' ? 'Video call' : b.address.area) + ' · ' + pay(b) + '</small></span><span class="badge ' + st.tone + '">' + esc(st.label) + '</span></button>';
  }

  /* ================= TODAY ================= */
  function today() {
    const s = BV.state(), me = pr.me(), v = BV.verify.summary(me), e = pr.earnings(), pend = pr.pending(), chg = pr.changes(), dk = U.dkey(U.today()), todays = pr.onDay(dk), next = pr.nextJob();
    const online = me.availability.online, managed = pr.managed(), unread = BV.notif.unread(s, 'pro', me.id);
    const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const status = v.status !== 'verified'
      ? '<div class="status-line"><div><b>' + (v.status === 'in_review' ? 'Verification in review' : v.status === 'action_needed' ? 'Action needed' : 'Not live yet') + '</b><small>You appear to patients once verified</small></div><button class="btn sm" style="background:#fff;color:var(--brand)" data-act="nav" data-v="/verification">View</button></div>'
      : '<div class="status-line"><div><b>' + (online ? (managed ? 'Available for assignments' : 'You are online') : 'You are paused') + '</b><small>' + (online ? (managed ? 'The care team can assign you visits' : 'Patients can send you requests') : 'No new requests until you go online') + '</small></div><button class="switch' + (online ? ' on' : '') + '" role="switch" aria-checked="' + online + '" aria-label="Online" data-act="pro.online"><i></i></button></div>';
    const head = '<div class="pro-head"><div class="top"><div><small>' + greet + '</small><h1>' + esc(U.firstName(me.name)) + '</h1></div><div class="row"><button class="icon-btn" data-act="nav" data-v="/notifications" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + I('bell') + (unread ? '<i class="badge-dot"></i>' : '') + '</button></div></div>' + status + '</div>' +
      '<div class="kpis"><div class="kpi"><b>' + todays.length + '</b><span>visits today</span></div><div class="kpi"><b>' + (managed ? pr.upcoming().length : pend.length) + '</b><span>' + (managed ? 'assigned' : 'new requests') + '</span></div><div class="kpi"><b>' + U.money(e.week) + '</b><span>last 7 days</span></div></div>';
    const exp = v.expiring ? '<div class="callout warn mt-3">' + I('clock', 'sm') + '<span><b>A document expires soon</b>Renew it to stay visible to patients. <button class="link" data-act="nav" data-v="/verification">Open</button></span></div>' : '';
    const nextCard = next ? '<div class="next-up' + (['en_route', 'in_progress'].includes(next.status) ? ' now' : '') + '"><div class="between"><span class="lab" style="margin:0">' + (['en_route', 'in_progress', 'report_due'].includes(next.status) ? 'Happening now' : 'Next up') + '</span>' + C.statusPill(next, 'pro') + '</div>' +
      '<button style="all:unset;display:block;width:100%;cursor:pointer;margin-top:8px" data-act="nav" data-v="/request/' + next.id + '"><b style="font-size:1.1rem">' + esc(svcOf(next).name) + '</b><div class="muted">' + esc(U.firstName(recOf(next, s).name)) + ' · ' + esc(whenTxt(next)) + '</div><div class="muted small">' + I('pin', 'sm') + ' ' + esc(next.mode === 'video' ? 'Video call' : next.address.area) + ' · you earn ' + pay(next) + '</div></button><div class="mt-3">' + jobAction(next, true) + '</div></div>' : '';
    const reqBlock = !managed && pend.length ? '<button class="card clickable list-row" style="border:0;border-left:5px solid #D98A00;margin-bottom:10px" data-act="tab" data-v="/requests"><span class="ic-tile amber">' + I('bell') + '</span><span class="grow"><b>' + pend.length + ' ' + U.plural(pend.length, 'request') + ' waiting</b><small>Next one expires in ' + U.until(pend[0].expiresAt) + '</small></span>' + I('chev', 'chev') + '</button>' : '';
    const chgBlock = chg.map(b => '<button class="card clickable list-row" style="border:0;margin-bottom:10px" data-act="nav" data-v="/request/' + b.id + '"><span class="ic-tile amber">' + I('cal') + '</span><span class="grow"><b>New time requested</b><small>' + esc(U.firstName(recOf(b, s).name)) + '\'s family asks for ' + esc(U.when(b.change.date, b.change.time)) + '</small></span>' + I('chev', 'chev') + '</button>').join('');
    const html = head + '<div class="mt-4"></div>' + exp + reqBlock + chgBlock + nextCard +
      (me.verification.status !== 'verified' ? '<div class="callout mt-3">' + I('shield', 'sm') + '<span><b>Almost there</b>' + v.passed + ' of ' + v.total + ' checks done. Patients cannot see or book you until all pass.</span></div>' : '') +
      '<div class="day-h"><h3>Today</h3><small>' + todays.length + ' ' + U.plural(todays.length, 'visit') + '</small></div>' +
      (todays.length ? todays.map(b => apptRow(b, s)).join('') : C.empty('cal', 'No visits today', online ? (managed ? 'The care team will assign visits as they come in.' : 'New requests will appear here as they come in.') : 'You are paused. Go online to receive requests.')) +
      '<div class="day-h"><h3>Earnings</h3><button class="link" data-act="nav" data-v="/earnings">Details</button></div>' +
      '<button class="card clickable list-row" style="border:0" data-act="nav" data-v="/earnings"><span class="ic-tile green">' + I('wallet') + '</span><span class="grow"><b>' + U.money(managed ? e.accrued : e.available) + '</b><small>' + (managed ? 'accrued, paid in the monthly payroll' : 'available to withdraw') + '</small></span>' + I('chev', 'chev') + '</button>';
    return { html, tab: 'today', title: 'Today' };
  }
  BV.act('pro.online', () => { const on = !pr.me().availability.online; BV.Store.update(s => { s.pros.find(p => p.id === pr.me().id).availability.online = on; }); BV.UI.toast(on ? 'You are online' : 'You are paused'); });

  /* ================= REQUESTS ================= */
  function requests() {
    const s = BV.state(), managed = pr.managed(), me = pr.me();
    let html = C.topbar({ title: managed ? 'Assignments' : 'Requests', sub: managed ? 'Visits assigned to you by the care team' : 'Reply quickly to rank higher', back: false });
    if (managed) {
      const up = pr.upcoming();
      html += (up.length ? up.map(b => reqCard(b, s)).join('') : C.empty('bell', 'No assignments right now', 'You will be notified when the care team assigns you a visit.')) +
        '<div class="callout mt-3">' + I('info', 'sm') + '<span><b>How assignments work</b>The BUSHEMI care team matches you using area, language, skills and availability. If you cannot make one, open it and ask to be reassigned as early as you can.</span></div>';
    } else {
      const pend = pr.pending(), chg = pr.changes(), past = pr.mine().filter(b => ['declined', 'expired'].includes(b.status) || (b.status === 'cancelled')).sort((a, b) => b.timeline[b.timeline.length - 1].ts - a.timeline[a.timeline.length - 1].ts).slice(0, 4);
      html += (pr.verified() ? '' : '<div class="callout warn">' + I('shield', 'sm') + '<span><b>Not live yet</b>You will only receive requests once verification is complete.</span></div>') +
        (pend.length ? '<div class="day-h"><h3>Waiting for your answer</h3><small>' + pend.length + '</small></div>' + pend.map(b => reqCard(b, s)).join('') : (pr.verified() ? C.empty('bell', 'No new requests', me.availability.online ? 'Keep your availability up to date to get more requests.' : 'You are paused. Go online from Today to receive requests.', { label: 'Edit availability', act: 'nav', v: '/availability' }) : '')) +
        (chg.length ? '<div class="day-h"><h3>Reschedule requests</h3><small>' + chg.length + '</small></div>' + chg.map(b => '<button class="appt" data-act="nav" data-v="/request/' + b.id + '"><span class="t">' + I('cal') + '</span><span class="m"><b>' + esc(U.firstName(recOf(b, s).name)) + ' wants ' + esc(U.when(b.change.date, b.change.time)) + '</b><small>Currently ' + esc(whenTxt(b)) + '</small></span><span class="badge warn">Decide</span></button>').join('') : '') +
        (past.length ? '<div class="day-h"><h3>Recently closed</h3></div>' + past.map(b => '<button class="appt" data-act="nav" data-v="/request/' + b.id + '"><span class="t">' + I('close') + '</span><span class="m"><b>' + esc(svcOf(b).short) + ' · ' + esc(U.firstName(recOf(b, s).name)) + '</b><small>' + esc(whenTxt(b)) + '</small></span><span class="badge neutral">' + esc(BV.booking.info(b, 'pro').label) + '</span></button>').join('') : '') +
        '<p class="muted small mt-3">Requests that are not answered within ' + BV.config.requestResponseHours + ' hours expire and the patient\'s payment hold is released. Your response rate affects your ranking.</p>';
    }
    return { html, tab: 'requests', title: managed ? 'Assignments' : 'Requests' };
  }

  function conflict(b) {
    const me = pr.me(), svc = svcOf(b); if (b.mode === 'video' && false) return false;
    return !BV.avail.proSlots(me, svc, b.date, BV.state(), b.id).some(x => x.time === b.time && x.ok);
  }
  BV.act('req.accept', v => {
    const b = BV.booking.byId(BV.state(), v);
    const go = () => { BV.booking.accept(v, pr.me().id); BV.UI.toast('Accepted. The family has been told.'); };
    if (conflict(b)) BV.UI.confirm({ title: 'Possible clash', text: 'This overlaps another visit or falls outside your working hours. Accept anyway?', yes: 'Accept anyway', onYes: go }); else go();
  });
  const DECLINE = ['I am not available then', 'Too far for me', 'Outside my skills', 'Fully booked this week', 'Other'];
  BV.act('req.decline', v => {
    BV.UI.sheet('<h2>Decline this request?</h2><p class="muted small mt-1">The family\'s payment hold is released and we suggest similar professionals. Your reason is private.</p><div class="lab mt-4">Reason</div>' + C.choice(DECLINE, D.get('dc.reason', ''), 'req.dcr', ' data-b="' + v + '"') +
      '<div class="stack mt-4"><button class="btn danger block" data-act="req.dcgo" data-v="' + v + '">Decline request</button><button class="btn secondary block" data-act="ui.closeSheet">Keep it</button></div>', { label: 'Decline' });
  });
  BV.act('req.dcr', (v, el) => { D.set('dc.reason', v); BV.acts['req.decline'](el.dataset.b); });
  BV.act('req.dcgo', v => { BV.booking.decline(v, pr.me().id, D.get('dc.reason', '')); D.clear('dc'); BV.UI.closeSheet(); BV.UI.toast('Declined'); if (/^\/request\//.test(BV.Router.cur.path)) BV.Router.go('/requests', { replace: true }); });
  BV.act('req.change', v => { const p = v.split('|'); BV.booking.resolveChange(p[0], p[1] === 'yes'); BV.UI.toast(p[1] === 'yes' ? 'New time confirmed' : 'Kept the original time'); });
  BV.act('job.release', v => BV.UI.sheet('<h2>Ask to be reassigned?</h2><p class="muted small mt-1">The care team will find another professional. Please do this as early as possible so the family is not left waiting.</p><div class="lab mt-4">Reason</div>' + C.choice(['I am unwell', 'Emergency at home', 'Clash with another visit', 'Other'], D.get('rl.reason', ''), 'job.rlr', ' data-b="' + v + '"') + '<div class="stack mt-4"><button class="btn danger block" data-act="job.rlgo" data-v="' + v + '">Ask to be reassigned</button><button class="btn secondary block" data-act="ui.closeSheet">Cancel</button></div>', { label: 'Reassign' }));
  BV.act('job.rlr', (v, el) => { D.set('rl.reason', v); BV.acts['job.release'](el.dataset.b); });
  BV.act('job.rlgo', v => { BV.booking.release(v, pr.me().id, D.get('rl.reason', '')); D.clear('rl'); BV.UI.closeSheet(); BV.UI.toast('The care team will find a replacement'); BV.Router.go('/requests', { replace: true }); });
  BV.act('job.cancel', v => BV.UI.sheet('<h2>Cancel this visit?</h2><div class="callout warn mt-3">' + I('alert', 'sm') + '<span><b>This affects your reliability score</b>The family is told right away and their payment hold is released. Please message them first if you can.</span></div><div class="lab mt-4">Reason</div>' + C.choice(['I am unwell', 'Emergency at home', 'Clash with another visit', 'Other'], D.get('cx.reason', ''), 'job.cxr', ' data-b="' + v + '"') + '<div class="stack mt-4"><button class="btn danger block" data-act="job.cxgo" data-v="' + v + '">Cancel the visit</button><button class="btn secondary block" data-act="ui.closeSheet">Keep it</button></div>', { label: 'Cancel visit' }));
  BV.act('job.cxr', (v, el) => { D.set('cx.reason', v); BV.acts['job.cancel'](el.dataset.b); });
  BV.act('job.cxgo', v => { BV.booking.cancel(v, 'pro', D.get('cx.reason', '')); D.clear('cx'); BV.UI.closeSheet(); BV.UI.toast('Visit cancelled'); });

  /* ================= REQUEST / VISIT DETAIL ================= */
  function request(p) {
    const s = BV.state(), me = pr.me(), b = BV.booking.byId(s, p.params.id);
    if (!b || b.pro !== me.id) return { html: C.topbar({ title: 'Visit', back: '/requests' }) + C.empty('search', 'Not available', 'This booking is not assigned to you, or it was removed when the demo was reset.', { label: 'Back to requests', act: 'nav', v: '/requests' }), tab: 'requests' };
    const svc = svcOf(b), r = recOf(b, s), pv = BV.booking.proView(b, s), managed = b.model === 'managed', st = b.status, shared = b.consent.shareHealth;
    const hh = s.households.find(h => h.id === b.household);
    const patient = '<div class="card"><div class="row">' + U.avatar(pv.full ? pv.name : pv.first, 52) + '<div class="grow"><b style="font-size:1.05rem">' + esc(pv.full ? pv.name : pv.first) + '</b><div class="muted small">' + pv.age + ' years · ' + esc(pv.relation) + (pv.full ? ' · booked by ' + esc(hh.members[0].name) : '') + '</div></div>' + C.statusPill(b, 'pro') + '</div>' +
      (st === 'requested' ? '<div class="mt-3"><span class="timer">' + I('clock', 'sm') + 'Reply within ' + U.until(b.expiresAt) + '</span></div>' : '') + '</div>';
    const priv = !pv.full ? '<div class="priv">' + I('lock', 'sm') + '<span><b>Limited view.</b> Full address, health summary and contact details are shared after you accept.</span></div>' : '';
    const where = b.mode === 'video' ? 'Video call' : (pv.full ? esc(b.address.label + ', ' + b.address.area) + '<br><small class="muted">' + esc(b.address.line) + '<br>' + esc(b.address.landmark) + '</small>' : esc(b.address.area) + ' (exact address after accepting)');
    const when = '<div class="card">' + C.kv('When', esc(whenTxt(b))) + C.kv('Where', where) + C.kv('Service', esc(svc.name) + ' · ' + (svc.duration || 60) + ' min') + C.kv('Delivered as', C.badgeModel(b.model)) + (b.notes ? C.kv('Reason', esc(b.notes)) : '') + '</div>';
    let clin = '';
    if (pv.full) {
      if (shared) {
        clin = C.section('Health summary') + '<div class="card"><div class="clin">' + (r.allergies.length ? '<div class="clin-item alert"><b>Allergies</b>' + esc(r.allergies.join(', ')) + '</div>' : '<div class="clin-item"><b>Allergies</b>None recorded</div>') +
          '<div class="clin-item"><b>Conditions</b>' + (r.conditions.length ? esc(r.conditions.join(', ')) : 'None recorded') + '</div><div class="clin-item"><b>Medicines</b>' + (r.meds.length ? r.meds.map(m => esc(m.name + ' ' + m.dose + ' at ' + m.times.join(', '))).join('<br>') : 'None recorded') + '</div>' +
          (pv.emergency && pv.emergency.name ? '<div class="clin-item"><b>Emergency contact</b>' + esc(pv.emergency.name) + ' · ' + esc(pv.emergency.phone) + '</div>' : '') + '</div></div>' +
          C.section('Suggested checks') + '<div class="card flat"><ul class="facts">' + pr.carePlan(r).map(x => '<li>' + I('check', 'sm') + '<div><span style="color:var(--ink)">' + esc(x) + '</span></div></li>').join('') + '</ul><p class="muted small mt-2">Based on recorded conditions. Use your own clinical judgement.</p></div>';
        const prev = s.bookings.filter(x => x.recipient === r.id && x.status === 'completed' && x.report && x.id !== b.id && (managed || x.pro === me.id || x.model === 'managed')).sort((a, c) => c.report.submittedAt - a.report.submittedAt).slice(0, 2);
        if (prev.length) clin += C.section('Previous visits') + prev.map(x => '<div class="card flat"><div class="between"><b>' + esc(BV.svc(x.service).name) + '</b><small class="muted">' + esc(U.relDay(x.date)) + '</small></div><p class="small mt-1">' + esc(x.report.observations || x.report.advice || '') + '</p></div>').join('');
      } else clin = '<div class="callout mt-3">' + I('lock', 'sm') + '<span><b>No health summary shared</b>The family chose not to share it. Ask about allergies, conditions and medicines at the start of the visit.</span></div>';
    }
    const earn = '<div class="card green"><div class="between"><div><b>' + pay(b) + '</b><div class="muted small">' + (managed ? 'Visit pay, set by BUSHEMI and paid in the monthly payroll' : 'You earn the full rate you set. The patient pays the service fee on top.') + '</div></div>' + I('wallet') + '</div></div>';
    const acts = [];
    if (st === 'requested') acts.push('<div class="btn-pair"><button class="btn secondary" data-act="req.decline" data-v="' + b.id + '">Decline</button><button class="btn primary" data-act="req.accept" data-v="' + b.id + '">Accept request</button></div>');
    if (b.change && st === 'confirmed') acts.push('<div class="callout warn">' + I('cal', 'sm') + '<span><b>' + esc(U.firstName(r.name)) + '\'s family asks to move this to ' + esc(U.when(b.change.date, b.change.time)) + '</b></span></div><div class="btn-pair"><button class="btn secondary" data-act="req.change" data-v="' + b.id + '|no">Keep original</button><button class="btn primary" data-act="req.change" data-v="' + b.id + '|yes">Approve new time</button></div>');
    const ja = jobAction(b, true); if (ja) acts.push(ja);
    if (['confirmed', 'en_route', 'in_progress', 'report_due', 'requested'].includes(st)) acts.push('<button class="btn secondary block" data-act="nav" data-v="/chat/' + b.id + '">' + I('chat', 'sm') + 'Message ' + esc(U.firstName(hh.members[0].name)) + '</button>');
    if (st === 'confirmed') acts.push(managed ? '<button class="btn danger-o block" data-act="job.release" data-v="' + b.id + '">Ask to be reassigned</button>' : '<button class="btn danger-o block" data-act="job.cancel" data-v="' + b.id + '">Cancel this visit</button>');
    const led = s.ledger.find(l => l.booking === b.id);
    const done = st === 'completed' && b.report ? C.section('Your report') + '<div class="card">' + ((b.report.care || []).length ? '<div class="chips">' + b.report.care.map(x => '<span class="badge ok">' + esc(x) + '</span>').join('') + '</div>' : '') + (b.report.observations ? '<p class="mt-3">' + esc(b.report.observations) + '</p>' : '') + (b.report.advice ? '<p class="mt-2 muted">Advice: ' + esc(b.report.advice) + '</p>' : '') +
      (b.report.escalate ? '<div class="callout err mt-3">' + I('alert', 'sm') + '<span><b>Escalated to the family</b>' + esc(b.report.followUpNote) + '</span></div>' : '') +
      '<p class="muted small mt-3">' + (managed ? (b.report.review === 'approved' ? 'Reviewed by the BUSHEMI clinical lead.' : 'Waiting for clinical lead review.') : 'This is your own record of the visit.') + (led ? ' · Earnings ' + esc(led.status === 'paid_out' ? 'paid out' : led.status === 'accrued' ? 'accrued' : 'available') + '.' : '') + '</p></div>' : '';
    const newDone = p.query.done ? '<div class="card green" style="text-align:center"><div class="tick">' + I('check') + '</div><h2>Report submitted</h2><p class="muted mt-1">The family can read it now. ' + pay(b) + ' ' + (managed ? 'was added to your payroll balance.' : 'is available to withdraw.') + '</p></div>' : '';
    const html = C.topbar({ title: svc.name, sub: 'Ref ' + b.ref, back: '/requests' }) + newDone + patient + priv + (acts.length ? '<div class="stack mt-3">' + acts.join('') + '</div>' : '') +
      C.section('Visit') + when + earn + clin + done + C.section('Activity') + '<div class="card">' + C.timeline(b) + '</div>';
    return { html, tab: 'requests', title: svc.name };
  }

  /* ================= VISIT REPORT ================= */
  const RANGE = { pulse: [30, 220, 'Pulse'], temp: [32, 43, 'Temperature'], sugar: [1, 40, 'Blood sugar'], spo2: [50, 100, 'Oxygen'] };
  function report(p) {
    const s = BV.state(), me = pr.me(), b = BV.booking.byId(s, p.params.id);
    if (!b || b.pro !== me.id) return pr.redirect('/requests');
    if (b.status === 'completed') return pr.redirect('/request/' + b.id);
    if (b.status !== 'report_due' && b.status !== 'in_progress') return { html: C.topbar({ title: 'Visit report', back: '/request/' + b.id }) + C.empty('clipboard', 'Finish the visit first', 'You can write the report once the visit has ended.', { label: 'Open visit', act: 'nav', v: '/request/' + b.id }), tab: 'requests' };
    const k = 'rep.' + b.id + '.', r = recOf(b, s), err = D.get('rep_err', {}), chips = BV.data.visitChips[me.type] || BV.data.visitChips.nurse, sel = D.get(k + 'chips', []), esc2 = D.get(k + 'esc', false), fu = D.get(k + 'fu', false);
    const html = C.topbar({ title: 'Visit report', sub: esc(U.firstName(r.name)) + ' · ' + esc(svcOf(b).name), back: '/request/' + b.id }) +
      '<div class="priv">' + I('lock', 'sm') + '<span>Saved on this device as you write. The family and, for Care Team visits, the clinical lead can read it once submitted.</span></div>' +
      (b.status === 'in_progress' ? '<div class="callout warn">' + I('info', 'sm') + '<span>The visit is still in progress. <button class="link" data-act="job.end" data-v="' + b.id + '">End it</button> before submitting.</span></div>' : '') +
      '<div class="card"><b>Readings</b><p class="muted small mb-2">Fill in what you measured. Leave the rest blank.</p><div class="vital-grid mt-2">' +
      C.input({ id: 'rp-bp', label: 'Blood pressure', draft: k + 'bp', placeholder: '120/80', inputmode: 'numeric', err: err.bp }) + C.input({ id: 'rp-pulse', label: 'Pulse (bpm)', draft: k + 'pulse', type: 'number', inputmode: 'numeric', err: err.pulse }) +
      C.input({ id: 'rp-temp', label: 'Temp (°C)', draft: k + 'temp', type: 'number', inputmode: 'decimal', err: err.temp }) + C.input({ id: 'rp-sugar', label: 'Sugar (mmol/L)', draft: k + 'sugar', type: 'number', inputmode: 'decimal', err: err.sugar }) +
      C.input({ id: 'rp-spo2', label: 'Oxygen (%)', draft: k + 'spo2', type: 'number', inputmode: 'numeric', err: err.spo2 }) + '</div></div>' +
      '<div class="card"><b>What you did</b><div class="mt-3">' + C.multi(chips, sel, 'rep.chip') + (err.chips ? '<small class="err-text" role="alert">' + err.chips + '</small>' : '') + '</div></div>' +
      '<div class="card">' + C.textarea({ id: 'rp-obs', label: 'What you noticed', draft: k + 'obs', rows: 3, placeholder: 'How the person looked and felt, anything that changed…' }) + (err.obs ? '<small class="err-text" role="alert" style="margin-top:-8px;display:block">' + err.obs + '</small>' : '') +
      C.textarea({ id: 'rp-adv', label: 'Advice for the family', draft: k + 'adv', opt: true, rows: 2, placeholder: 'What they should do until the next visit' }) + '</div>' +
      '<div class="card">' + C.toggle({ label: 'Follow-up needed', sub: 'Suggest another visit or a check-up', on: fu, act: 'rep.fu' }) + (fu ? '<div class="mt-2">' + C.input({ id: 'rp-fn', label: 'What follow-up?', draft: k + 'fn', placeholder: 'Review in two weeks' }) + '</div>' : '') +
      C.toggle({ label: 'I am worried: advise urgent medical attention', sub: 'Sends a clear alert to the family. For emergencies, call ' + BV.config.emergencyNumber + ' yourself.', on: esc2, act: 'rep.esc' }) + (esc2 ? '<div class="mt-2">' + C.input({ id: 'rp-en', label: 'What should the family do?', draft: k + 'en', placeholder: 'Take her to the clinic today', err: err.en }) + '</div>' : '') + '</div>' +
      '<button class="btn primary block mt-3" data-act="rep.submit" data-v="' + b.id + '"' + (b.status === 'in_progress' ? ' disabled' : '') + '>Submit report</button>';
    return { html, tab: 'requests', title: 'Report' };
  }
  BV.act('rep.chip', v => { const id = BV.Router.cur.params.id, k = 'rep.' + id + '.chips', a = D.get(k, []).slice(), i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); D.set(k, a); BV.Router.refresh(); });
  BV.act('rep.fu', () => { const k = 'rep.' + BV.Router.cur.params.id + '.fu'; D.set(k, !D.get(k, false)); BV.Router.refresh(); });
  BV.act('rep.esc', () => { const k = 'rep.' + BV.Router.cur.params.id + '.esc'; D.set(k, !D.get(k, false)); BV.Router.refresh(); });
  BV.act('rep.submit', id => {
    const k = 'rep.' + id + '.', g = (x, d) => D.get(k + x, d), err = {};
    const bp = String(g('bp', '')).trim(); let m;
    if (bp) { m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(bp); if (!m || +m[1] < 60 || +m[1] > 260 || +m[2] < 30 || +m[2] > 180) err.bp = 'Use the form 120/80'; }
    Object.keys(RANGE).forEach(f => { const v = String(g(f, '')).trim(); if (v !== '') { const n = parseFloat(v); if (!(n >= RANGE[f][0] && n <= RANGE[f][1])) err[f] = 'Check this number'; } });
    if (!(g('chips', []) || []).length) err.chips = 'Choose at least one thing you did';
    if (!String(g('obs', '')).trim()) err.obs = 'Write what you noticed';
    if (g('esc', false) && !String(g('en', '')).trim()) err.en = 'Tell the family what to do';
    D.set('rep_err', err); if (Object.keys(err).length) { BV.Router.refresh(); BV.UI.toast('Please fix the highlighted items', 'err'); return; }
    const rep = { vitals: { bp: bp, pulse: g('pulse', ''), temp: g('temp', ''), sugar: g('sugar', ''), spo2: g('spo2', '') }, care: g('chips', []), observations: g('obs', '').trim(), advice: String(g('adv', '')).trim(), followUpNeeded: !!(g('fu', false) || g('esc', false)), followUpNote: g('esc', false) ? g('en', '').trim() : String(g('fn', '')).trim(), escalate: !!g('esc', false) };
    BV.UI.toast('Submitting…');
    BV.Net.call(() => BV.booking.submitReport(id, pr.me().id, rep)).then(() => { D.clear('rep.' + id); D.clear('rep_err'); BV.Router.go('/request/' + id + '?done=1', { replace: true }); })
      .catch(() => BV.UI.toast('No connection. Your report is saved on this device. Try again.', 'err'));
  });

  /* ================= SCHEDULE ================= */
  function schedule() {
    const s = BV.state(), me = pr.me(), sel = D.get('sch.day', U.dkey(U.today())), days = [0, 1, 2, 3, 4, 5, 6].map(n => { const d = U.addDays(U.today(), n), dk = U.dkey(d); return { d, dk, n: pr.onDay(dk).length, off: !me.availability.days[U.wdIndex(d)] || me.availability.blocked.includes(dk) }; });
    const list = pr.onDay(sel), later = pr.upcoming().filter(b => U.diffDays(b.date) > 6);
    const html = C.topbar({ title: 'Schedule', back: false, right: '<button class="btn sm secondary" data-act="nav" data-v="/availability">' + I('clock', 'sm') + 'Availability</button>' }) +
      '<div class="week">' + days.map(x => '<button class="wk' + (x.dk === sel ? ' on' : x.off ? ' off' : '') + '" data-act="sch.day" data-v="' + x.dk + '" aria-label="' + esc(U.fmtDay(x.d)) + ', ' + x.n + ' visits' + (x.off ? ', not working' : '') + '">' + x.d.getDate() + '<small>' + U.WD[U.wdIndex(x.d)] + '</small><small style="font-weight:800">' + (x.n || (x.off ? '–' : '·')) + '</small></button>').join('') + '</div>' +
      '<div class="day-h"><h3>' + esc(U.relDay(sel)) + '</h3><small>' + list.length + ' ' + U.plural(list.length, 'visit') + '</small></div>' +
      (list.length ? list.map(b => apptRow(b, s)).join('') : C.empty('cal', 'Nothing booked', days.find(x => x.dk === sel).off ? 'You are not working this day.' : 'You are free. New bookings will appear here.', { label: 'Edit availability', act: 'nav', v: '/availability' })) +
      (later.length ? '<div class="day-h"><h3>Later</h3></div>' + later.map(b => apptRow(b, s)).join('') : '');
    return { html, tab: 'schedule', title: 'Schedule' };
  }
  BV.act('sch.day', v => { D.set('sch.day', v); BV.Router.refresh(); });

  /* ================= AVAILABILITY ================= */
  function availability() {
    const me = pr.me(), a = me.availability, svc = BV.svc(me.services[0].id), next = BV.avail.nextAvailable(me, svc), managed = pr.managed();
    const html = C.topbar({ title: 'Availability', sub: 'Changes apply immediately', back: '/me' }) +
      '<div class="card">' + C.toggle({ label: 'Accepting bookings', sub: a.online ? (managed ? 'The care team can assign you visits' : 'Patients can send you requests') : 'Paused. Nobody can book you.', on: a.online, act: 'pro.online' }) + '</div>' +
      '<div class="callout ' + (next ? 'ok' : 'warn') + ' mt-2">' + I(next ? 'check' : 'alert', 'sm') + '<span><b>' + (next ? 'Patients see you free from ' + esc(U.when(next.date, next.time)) : 'Patients cannot book you right now') + '</b>' + (next ? '' : 'Turn on at least one day and shift, and make sure you are online.') + '</span></div>' +
      C.section('Working days') + '<div class="week">' + U.WD.map((d, i) => '<button class="wk' + (a.days[i] ? ' on' : ' off') + '" data-act="av.day" data-v="' + i + '" aria-pressed="' + !!a.days[i] + '">' + d.slice(0, 1) + '<small>' + d + '</small></button>').join('') + '</div>' +
      C.section('Shifts') + '<div class="card" style="padding:2px 14px">' + BV.avail.SHIFT_ORDER.map(k => '<div class="shift"><div><b>' + SH()[k].label + '</b><small>' + SH()[k].range + '</small></div><button class="switch' + (a.shifts.includes(k) ? ' on' : '') + '" role="switch" aria-checked="' + a.shifts.includes(k) + '" aria-label="' + SH()[k].label + '" data-act="av.shift" data-v="' + k + '"><i></i></button></div>').join('') + '</div>' +
      C.section('Days off') + '<p class="muted small" style="margin-bottom:8px">Tap a date to block it. Existing bookings are not cancelled.</p><div class="chips scroll">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => { const d = U.addDays(U.today(), n), dk = U.dkey(d); return '<button class="chip stacked' + (a.blocked.includes(dk) ? ' on' : '') + '" data-act="av.block" data-v="' + dk + '" aria-pressed="' + a.blocked.includes(dk) + '">' + U.WD[U.wdIndex(d)] + '<small>' + d.getDate() + '</small></button>'; }).join('') + '</div>' +
      C.section('Areas you cover') + (managed ? '<div class="callout">' + I('info', 'sm') + '<span>The care team sets your areas based on assignments: ' + esc(me.areas.slice(0, 6).join(', ')) + (me.areas.length > 6 ? '…' : '') + '</span></div>'
        : me.areas.length || me.services.some(x => BV.svc(x.id).mode === 'home') ? C.multi(BV.data.areas, me.areas, 'av.area') : '<div class="callout">' + I('video', 'sm') + '<span>Your services are by video or voice, so area does not matter.</span></div>');
    return { html, tab: 'schedule', title: 'Availability' };
  }
  const setAv = fn => BV.Store.update(s => fn(s.pros.find(p => p.id === pr.me().id)));
  BV.act('av.day', v => setAv(p => { p.availability.days[+v] = p.availability.days[+v] ? 0 : 1; }));
  BV.act('av.shift', v => setAv(p => { const a = p.availability.shifts, i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }));
  BV.act('av.block', v => setAv(p => { const a = p.availability.blocked, i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }));
  BV.act('av.area', v => setAv(p => { const a = p.areas, i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }));

  BV.prroute('/', today);
  BV.prroute('/requests', requests);
  BV.prroute('/request/:id', request);
  BV.prroute('/report/:id', report);
  BV.prroute('/schedule', schedule);
  BV.prroute('/availability', availability);
  BV.prroute('/messages', BV.shared.inboxView);
  BV.prroute('/chat/:id', BV.shared.chatView);
  BV.prroute('/notifications', BV.shared.notificationsView);
  BV.route('/404', BV.shared.notFound);
})(window.BV);
