/* BUSHEMI v3 · patient/care.js
   Patient health information, medicines and reminders, vitals, care history, and family access. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp, pt = BV.pt, D = BV.Draft, S = BV.Session;

  const ageTxt = r => r.age ? ', ' + r.age : '';
  const careNav = on => '<div class="seg" role="tablist">' + [['', 'Overview'], ['/meds', 'Medicines'], ['/vitals', 'Vitals'], ['/history', 'History']].map(x =>
    '<button role="tab" aria-selected="' + (on === x[0]) + '" class="' + (on === x[0] ? 'on' : '') + '" data-act="tab" data-v="/care' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  const people = cur => '<div class="pill-people" role="radiogroup" aria-label="Person">' + pt.people().map(x => '<button class="pill-person' + (x.id === cur.id ? ' on' : '') + '" role="radio" aria-checked="' + (x.id === cur.id) + '" data-act="care.who" data-v="' + x.id + '">' + U.avatar(x.name, 30) + esc(U.firstName(x.name)) + '</button>').join('') + '<button class="pill-person" data-act="care.add">' + I('plus', 'sm') + 'Add</button></div>';
  BV.act('care.who', v => { S.set('recipient', v); BV.Router.refresh(); });
  BV.act('care.add', () => pt.sheetPerson(id => { S.set('recipient', id); BV.Router.refresh(); }));
  const header = (cur, on) => C.topbar({ title: 'Care', sub: 'Health information and history', back: false }) + people(cur) + careNav(on);
  const noPerson = () => ({ html: C.topbar({ title: 'Care', back: false }) + C.empty('users', 'Add someone to care for', 'Keep health information, medicines and history in one place.', { label: 'Add a person', act: 'care.add' }), tab: 'care' });

  /* ============ OVERVIEW ============ */
  function care() {
    const cur = pt.cur(); if (!cur) return noPerson();
    const s = BV.state(), done = s.bookings.filter(b => b.recipient === cur.id && b.status === 'completed' && b.report).sort((a, b) => b.report.submittedAt - a.report.submittedAt);
    const last = done[0], bp = cur.vitals.bp, sg = cur.vitals.sugar, wt = cur.vitals.weight;
    const dues = pt.dueMeds(cur), left = dues.filter(d => !d.done);
    const vcard = (label, arr, fmt, unit, color) => arr.length ? '<div class="card" style="margin:0"><small class="muted">' + label + '</small><div class="vit" style="grid-template-columns:1fr 80px"><div><b class="n">' + fmt(arr[arr.length - 1]) + '</b> <small>' + unit + '</small><br><small>' + U.ago(arr[arr.length - 1].ts) + '</small></div>' + C.spark(arr.map(x => x.a), color) + '</div></div>' : '';
    const html = header(cur, '') +
      '<div class="card"><div class="between"><div><b style="font-size:1.1rem">' + esc(cur.name) + '</b><div class="muted small">' + esc(cur.relation) + ageTxt(cur) + '</div></div>' + U.avatar(cur.name, 48) + '</div>' +
      (cur.allergies.length ? '<div class="callout err mt-3">' + I('alert', 'sm') + '<span><b>Allergies</b>' + esc(cur.allergies.join(', ')) + '</span></div>' : '<p class="muted small mt-3">No allergies recorded.</p>') +
      '<div class="lab mt-3">Conditions</div>' + (cur.conditions.length ? '<div class="chips">' + cur.conditions.map(x => '<span class="badge neutral">' + esc(x) + '</span>').join('') + '</div>' : '<p class="muted small">None recorded.</p>') +
      (cur.emergency && cur.emergency.name ? '<div class="lab mt-3">Emergency contact</div><p>' + esc(cur.emergency.name) + ' · ' + esc(cur.emergency.phone) + '</p>' : '') + '</div>' +
      ((bp.length || sg.length || wt.length) ? C.section('Latest readings', 'See all', 'tab', '/care/vitals') + '<div class="stack">' + vcard('Blood pressure', bp, x => x.a + '/' + x.b, 'mmHg', 'var(--brand)') + vcard('Blood sugar', sg, x => x.a, 'mmol/L', 'var(--green)') + vcard('Weight', wt, x => x.a, 'kg', '#5B3FC4') + '</div>' : '') +
      (cur.meds.length ? C.section('Medicines today', 'Open', 'tab', '/care/meds') + '<div class="card">' + (left.length ? left.slice(0, 3).map(d => '<div class="med-row"><span class="ic-tile green">' + I('pill') + '</span><div class="grow"><b>' + esc(d.med.name) + '</b><small class="muted">' + esc(d.med.dose) + ' · ' + d.time + '</small></div>' + (d.late ? '<span class="badge warn">Due</span>' : '') + '</div>').join('') : '<p class="ok-text">' + I('check', 'sm') + ' All medicines done for today.</p>') + '</div>' : '') +
      (last ? C.section('Last visit') + '<button class="card clickable list-row" style="border:0;padding:14px" data-act="nav" data-v="/booking/' + last.id + '"><span class="ic-tile">' + I('clipboard') + '</span><span class="grow"><b>' + esc(BV.svc(last.service).name) + '</b><small>' + esc(U.relDay(last.date)) + ' · ' + esc((s.pros.find(p => p.id === last.pro) || {}).name || '') + '</small><small>' + esc((last.report.observations || '').slice(0, 90)) + '</small></span>' + I('chev', 'chev') + '</button>' : '') +
      '<div class="card flat mt-3"><div class="row" style="align-items:flex-start">' + I('lock', 'sm') + '<div class="small"><b>Who can see this</b><div class="muted">You and family members you invite. Professionals see allergies, conditions and medicines only after they accept a booking and only if you chose to share. <button class="link" data-act="nav" data-v="/family">Manage access</button></div></div></div></div>' +
      '<button class="btn secondary block mt-3" data-act="care.share" data-v="' + cur.id + '">' + I('share', 'sm') + 'Share a summary</button>';
    return { html, tab: 'care', title: 'Care' };
  }

  /* real, working: builds a plain-text summary the family can copy into WhatsApp or an SMS */
  function summaryText(r, s) {
    const last = s.bookings.filter(b => b.recipient === r.id && b.status === 'completed' && b.report).sort((a, b) => b.report.submittedAt - a.report.submittedAt)[0];
    const L = ['BUSHEMI health summary', r.name + ', ' + r.relation + (r.age ? ', ' + r.age + ' years' : ''), ''];
    L.push('Allergies: ' + (r.allergies.join(', ') || 'none recorded'), 'Conditions: ' + (r.conditions.join(', ') || 'none recorded'));
    L.push('Medicines: ' + (r.meds.map(m => m.name + ' ' + m.dose + ' at ' + m.times.join(', ')).join('; ') || 'none recorded'));
    const bp = r.vitals.bp.slice(-1)[0], sg = r.vitals.sugar.slice(-1)[0];
    if (bp) L.push('Last blood pressure: ' + bp.a + '/' + bp.b + ' (' + U.relDay(U.dkey(new Date(bp.ts))) + ')');
    if (sg) L.push('Last blood sugar: ' + sg.a + ' mmol/L (' + U.relDay(U.dkey(new Date(sg.ts))) + ')');
    if (last) L.push('Last visit: ' + BV.svc(last.service).name + ', ' + U.relDay(last.date) + '. ' + (last.report.observations || ''));
    L.push('', 'Shared by the family from BUSHEMI on ' + new Date().toDateString() + '. Information entered by the family and professionals; not a medical record.');
    return L.join('\n');
  }
  BV.act('care.share', v => {
    const r = BV.state().recipients.find(x => x.id === v), t = summaryText(r, BV.state());
    BV.UI.sheet('<h2>Summary to share</h2><p class="muted small mt-1">Copy this and send it by WhatsApp, SMS or email. You decide who receives it.</p><pre style="white-space:pre-wrap;font:inherit;font-size:.88rem;background:var(--surface-2);border-radius:12px;padding:12px;margin-top:12px">' + esc(t) + '</pre>' +
      '<button class="btn primary block mt-3" data-act="care.copy">' + I('doc', 'sm') + 'Copy summary</button>', { label: 'Summary' });
    D.set('share_text', t);
  });
  BV.act('care.copy', () => {
    const t = D.get('share_text', '');
    const ok = () => BV.UI.toast('Copied. Paste it into your message.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => BV.UI.toast('Select the text and copy it', 'err')); else BV.UI.toast('Select the text and copy it', 'err');
  });

  /* ============ MEDICINES ============ */
  function meds() {
    const cur = pt.cur(); if (!cur) return noPerson();
    const dues = pt.dueMeds(cur), left = dues.filter(d => !d.done).length, dk = U.dkey(new Date());
    const html = header(cur, '/meds') +
      (cur.meds.length ? '<div class="card"><div class="between"><b>Today</b><span class="badge ' + (left ? 'warn' : 'ok') + '">' + (left ? left + ' left' : 'All done') + '</span></div><div class="mt-2">' +
        dues.map(d => '<div class="med-row"><button class="med-check' + (d.done ? ' on' : '') + '" role="checkbox" aria-checked="' + d.done + '" aria-label="' + esc(d.med.name) + ' at ' + d.time + '" data-act="med.log" data-v="' + d.med.id + '|' + d.time + '">' + (d.done ? I('check') : '') + '</button><div class="grow"><b>' + esc(d.med.name) + '</b><small class="muted">' + esc(d.med.dose) + ' · ' + d.time + (d.late ? ' · overdue' : '') + '</small></div></div>').join('') + '</div></div>' +
        C.section('All medicines') + '<div class="card" style="padding:4px 16px">' + cur.meds.map(m => '<div class="med-row"><span class="ic-tile green">' + I('pill') + '</span><div class="grow"><b>' + esc(m.name) + '</b><small class="muted">' + esc(m.dose) + ' · ' + m.times.join(', ') + '</small></div><button class="icon-btn plain" data-act="med.del" data-v="' + m.id + '" aria-label="Remove ' + esc(m.name) + '">' + I('trash') + '</button></div>').join('') + '</div>'
        : C.empty('pill', 'No medicines yet', 'Add medicines to get reminders by SMS, WhatsApp or the app.')) +
      '<button class="btn secondary block mt-3" data-act="med.add">' + I('plus', 'sm') + 'Add a medicine</button>' +
      '<p class="muted small mt-3">' + I('bell', 'sm') + ' Reminder channels (app, SMS, WhatsApp) are in <button class="link" data-act="nav" data-v="/account">Account</button>. Reminders here are a memory aid, not medical advice. Follow the prescriber\'s instructions.</p>';
    return { html, tab: 'care', title: 'Medicines' };
  }
  BV.act('med.log', v => {
    const p = v.split('|'), cur = pt.cur(), dk = U.dkey(new Date()), key = dk + '_' + p[1];
    BV.Store.update(s => { const m = s.recipients.find(x => x.id === cur.id).meds.find(x => x.id === p[0]); if (m.log[key]) delete m.log[key]; else m.log[key] = true; });
  });
  BV.act('med.del', v => { const cur = pt.cur(), m = cur.meds.find(x => x.id === v); BV.UI.confirm({ title: 'Remove ' + m.name + '?', text: 'Its reminders will stop.', yes: 'Remove', tone: 'danger', onYes: () => BV.Store.update(s => { const r = s.recipients.find(x => x.id === cur.id); r.meds = r.meds.filter(x => x.id !== v); }) }); });
  function medSheet() {
    const err = D.get('md_err', {}), times = D.get('md.times', ['08:00']);
    BV.UI.sheet('<h2>Add a medicine</h2><div class="mt-3">' + C.input({ id: 'md-name', label: 'Name', draft: 'md.name', err: err.name, placeholder: 'e.g. Metformin' }) + C.input({ id: 'md-dose', label: 'Dose', draft: 'md.dose', placeholder: '500 mg, 1 tablet', err: err.dose }) +
      '<div class="lab">When is it taken?</div>' + C.multi(['06:00', '08:00', '13:00', '18:00', '20:00', '22:00'], times, 'md.time') + (err.times ? '<small class="err-text">' + err.times + '</small>' : '') + '</div><button class="btn primary block mt-4" data-act="md.save">Save medicine</button>', { label: 'Add medicine', onClose: () => { D.clear('md'); D.clear('md_err'); } });
  }
  BV.act('med.add', () => { D.clear('md'); D.set('md.times', ['08:00']); medSheet(); });
  BV.act('md.time', v => { const t = D.get('md.times', []).slice(), i = t.indexOf(v); if (i > -1) t.splice(i, 1); else t.push(v); D.set('md.times', t.sort()); medSheet(); });
  BV.act('md.save', () => {
    const m = D.get('md', {}), err = {};
    if (!String(m.name || '').trim()) err.name = 'Enter the medicine name';
    if (!String(m.dose || '').trim()) err.dose = 'Enter the dose';
    if (!(m.times || []).length) err.times = 'Pick at least one time';
    D.set('md_err', err); if (Object.keys(err).length) { medSheet(); return; }
    const cur = pt.cur();
    BV.Store.update(s => s.recipients.find(x => x.id === cur.id).meds.push({ id: U.uid('m'), name: m.name.trim(), dose: m.dose.trim(), times: m.times, log: {} }));
    D.clear('md'); D.clear('md_err'); BV.UI.closeSheet(); BV.UI.toast('Medicine added');
  });

  /* ============ VITALS ============ */
  function vitals() {
    const cur = pt.cur(); if (!cur) return noPerson();
    const block = (title, arr, fmt, unit, color) => '<div class="card"><div class="between"><b>' + title + '</b><span class="muted small">' + (arr.length ? arr.length + ' readings' : '') + '</span></div>' +
      (arr.length ? '<div class="vit"><div><b class="n">' + fmt(arr[arr.length - 1]) + '</b> <small>' + unit + '</small><br><small>' + U.ago(arr[arr.length - 1].ts) + (arr[arr.length - 1].by ? ' · by ' + esc(arr[arr.length - 1].by) : '') + '</small></div>' + C.spark(arr.map(x => x.a), color) + '</div><div class="mt-2">' +
        arr.slice(-4).reverse().map(x => '<div class="kv"><span>' + esc(U.relDay(U.dkey(new Date(x.ts)))) + (x.by ? ' · ' + esc(x.by) : ' · you') + '</span><b>' + fmt(x) + ' ' + unit + '</b></div>').join('') + '</div>' : '<p class="muted small mt-2">No readings yet.</p>') + '</div>';
    const html = header(cur, '/vitals') + block('Blood pressure', cur.vitals.bp, x => x.a + '/' + x.b, 'mmHg', 'var(--brand)') + block('Blood sugar', cur.vitals.sugar, x => x.a, 'mmol/L', 'var(--green)') + block('Weight', cur.vitals.weight, x => x.a, 'kg', '#5B3FC4') +
      '<button class="btn secondary block" data-act="vt.add">' + I('plus', 'sm') + 'Add a reading</button>' +
      '<p class="muted small mt-3">Readings from professionals appear here automatically after each visit. Speak to your clinic about any reading that worries you.</p>';
    return { html, tab: 'care', title: 'Vitals' };
  }
  function vtSheet() {
    const k = D.get('vt.kind', 'bp'), err = D.get('vt_err', {});
    BV.UI.sheet('<h2>Add a reading</h2><div class="mt-3">' + C.choice([['bp', 'Blood pressure'], ['sugar', 'Blood sugar'], ['weight', 'Weight']], k, 'vt.kind') + '</div><div class="mt-3">' +
      (k === 'bp' ? C.input({ id: 'vt-a', label: 'Top number (systolic)', draft: 'vt.a', type: 'number', inputmode: 'numeric', err: err.a }) + C.input({ id: 'vt-b', label: 'Bottom number (diastolic)', draft: 'vt.b', type: 'number', inputmode: 'numeric', err: err.b })
        : C.input({ id: 'vt-a', label: k === 'sugar' ? 'Blood sugar (mmol/L)' : 'Weight (kg)', draft: 'vt.a', type: 'number', inputmode: 'decimal', err: err.a })) +
      '</div><button class="btn primary block" data-act="vt.save">Save reading</button>', { label: 'Add reading', onClose: () => { D.clear('vt'); D.clear('vt_err'); } });
  }
  BV.act('vt.add', () => { D.clear('vt'); D.set('vt.kind', 'bp'); vtSheet(); });
  BV.act('vt.kind', v => { D.set('vt.kind', v); D.set('vt_err', {}); vtSheet(); });
  BV.act('vt.save', () => {
    const v = D.get('vt', {}), k = v.kind || 'bp', err = {}, a = parseFloat(v.a), b = parseFloat(v.b);
    const lim = { bp: [60, 260], sugar: [1, 40], weight: [2, 300] }[k];
    if (!(a >= lim[0] && a <= lim[1])) err.a = 'That looks out of range. Check the number.';
    if (k === 'bp' && !(b >= 30 && b <= 180)) err.b = 'That looks out of range. Check the number.';
    D.set('vt_err', err); if (Object.keys(err).length) { vtSheet(); return; }
    const cur = pt.cur();
    BV.Store.update(s => { const r = s.recipients.find(x => x.id === cur.id); r.vitals[k].push(k === 'bp' ? { ts: Date.now(), a, b } : { ts: Date.now(), a }); });
    D.clear('vt'); D.clear('vt_err'); BV.UI.closeSheet(); BV.UI.toast('Reading saved');
  });

  /* ============ HISTORY ============ */
  function history() {
    const cur = pt.cur(); if (!cur) return noPerson();
    const s = BV.state(), done = s.bookings.filter(b => b.recipient === cur.id && b.status === 'completed').sort((a, b) => BV.avail.startTs(b) - BV.avail.startTs(a));
    const html = header(cur, '/history') + (done.length ? done.map(b => {
      const p = s.pros.find(x => x.id === b.pro), r = b.report;
      return '<button class="card clickable" style="width:100%;text-align:left;border:0" data-act="nav" data-v="/booking/' + b.id + '"><div class="between"><b>' + esc(BV.svc(b.service).name) + '</b><span class="muted small">' + esc(U.relDay(b.date)) + '</span></div><div class="muted small">' + esc(p ? p.name : '') + ' · ' + (b.model === 'managed' ? 'BUSHEMI Care Team' : 'Independent') + '</div>' + (r ? '<p class="mt-2">' + esc((r.observations || r.advice || '').slice(0, 130)) + '</p>' : '') + (r && r.escalate ? '<span class="badge err mt-2">Follow-up advised</span>' : r && r.followUpNeeded ? '<span class="badge warn mt-2">Follow-up suggested</span>' : '') + '</button>';
    }).join('') : C.empty('clipboard', 'No care history yet', 'After each visit, the professional\'s summary is saved here automatically.', { label: 'Find care', act: 'nav', v: '/find' }));
    return { html, tab: 'care', title: 'History' };
  }

  /* ============ FAMILY AND ACCESS ============ */
  const ROLE = { owner: ['Owner', 'Can book, pay and manage everyone'], manager: ['Can book', 'Can book, pay and see updates'], viewer: ['View only', 'Can see updates and history, but cannot book'] };
  function family() {
    const hh = pt.hh(), me = pt.user(), mine = me.role === 'owner';
    const html = C.topbar({ title: 'Family and access', back: '/account' }) +
      '<p class="muted">Share updates with family. Choose who can book and who can only follow along.</p>' + C.section('People with access') + '<div class="card" style="padding:4px 16px">' +
      hh.members.map(m => '<div class="list-row">' + U.avatar(m.name, 44) + '<div class="grow"><b>' + esc(m.name) + (m.id === me.id ? ' (you)' : '') + '</b><small>' + esc(m.phone) + ' · ' + (m.status === 'invited' ? 'Invitation sent (simulated)' : ROLE[m.role][0]) + '</small></div>' +
        (m.id !== me.id && m.status === 'active' ? '<button class="btn sm secondary" data-act="fam.preview" data-v="' + m.id + '">Preview</button>' : '') +
        (mine && m.id !== me.id ? '<button class="icon-btn plain" data-act="fam.edit" data-v="' + m.id + '" aria-label="Edit ' + esc(m.name) + '">' + I('edit') + '</button>' : '') + '</div>').join('') + '</div>' +
      (mine ? '<button class="btn secondary block mt-3" data-act="fam.invite">' + I('plus', 'sm') + 'Invite a family member</button>' : '<p class="muted small mt-3">Only the owner can invite people or change access.</p>') +
      C.section('People receiving care') + '<div class="card" style="padding:4px 16px">' + pt.people().map(r => '<button class="list-row" data-act="fam.person" data-v="' + r.id + '">' + U.avatar(r.name, 44) + '<span class="grow"><b>' + esc(r.name) + '</b><small>' + esc(r.relation) + ageTxt(r) + (r.conditions.length ? ' · ' + esc(r.conditions.join(', ')) : '') + '</small></span>' + I('chev', 'chev') + '</button>').join('') + '</div>' +
      '<button class="btn secondary block mt-3" data-act="care.add">' + I('plus', 'sm') + 'Add a person to care for</button>' +
      C.section('Saved addresses') + '<div class="card" style="padding:4px 16px">' + (pt.addresses().map(a => '<div class="list-row"><span class="ic-tile">' + I('pin') + '</span><div class="grow"><b>' + esc(a.label) + ' · ' + esc(a.area) + '</b><small>' + esc(a.line) + ' · ' + esc(a.landmark) + '</small></div><button class="icon-btn plain" data-act="addr.del" data-v="' + a.id + '" aria-label="Delete ' + esc(a.label) + '">' + I('trash') + '</button></div>').join('') || '<p class="muted small" style="padding:12px 0">No saved addresses yet.</p>') + '</div>' +
      '<button class="btn secondary block mt-3" data-act="fam.addr">' + I('plus', 'sm') + 'Add an address</button>' +
      '<div class="card flat mt-4"><b>Access levels</b>' + Object.keys(ROLE).map(k => C.kv(ROLE[k][0], '<span class="muted" style="font-weight:400">' + ROLE[k][1] + '</span>')).join('') + '</div>';
    return { html, tab: null, title: 'Family' };
  }
  BV.act('fam.preview', v => { S.set('user', v); BV.UI.toast('Now previewing as ' + U.firstName(pt.user().name)); BV.Router.go('/', { replace: true }); });
  BV.act('fam.person', v => { S.set('recipient', v); BV.Router.go('/care'); });
  BV.act('fam.addr', () => pt.sheetAddress(() => BV.Router.refresh()));
  BV.act('addr.del', v => BV.UI.confirm({ title: 'Delete this address?', text: 'Existing bookings keep their address.', yes: 'Delete', tone: 'danger', onYes: () => BV.Store.update(s => { s.addresses = s.addresses.filter(a => a.id !== v); s.recipients.forEach(r => { if (r.address === v) r.address = null; }); }) }));
  BV.act('fam.invite', () => {
    const err = D.get('inv_err', {}), role = D.get('inv.role', 'viewer');
    BV.UI.sheet('<h2>Invite a family member</h2><div class="mt-3">' + C.input({ id: 'inv-name', label: 'Their name', draft: 'inv.name', err: err.name }) + C.input({ id: 'inv-phone', label: 'Mobile number', draft: 'inv.phone', inputmode: 'tel', prefix: '+260', err: err.phone }) +
      '<div class="lab">What can they do?</div>' + C.choice([['viewer', 'View only'], ['manager', 'Can book']], role, 'inv.role') + '<p class="muted small mt-2">' + esc(ROLE[role][1]) + '.</p></div><button class="btn primary block mt-3" data-act="inv.send">Send invitation</button>', { label: 'Invite', onClose: () => { D.clear('inv'); D.clear('inv_err'); } });
  });
  BV.act('inv.role', v => { D.set('inv.role', v); BV.acts['fam.invite'](); });
  BV.act('inv.send', () => {
    const i = D.get('inv', {}), err = {};
    if (!String(i.name || '').trim()) err.name = 'Enter their name';
    if (!/^9\d{8}$/.test(String(i.phone || '').replace(/\D/g, '').replace(/^260/, '').replace(/^0/, ''))) err.phone = 'Enter a valid Zambian mobile number';
    D.set('inv_err', err); if (Object.keys(err).length) { BV.acts['fam.invite'](); return; }
    const name = i.name.trim(), role = i.role || 'viewer', phone = i.phone;
    BV.Store.update(s => s.households.find(h => h.id === pt.hh().id).members.push({ id: U.uid('u'), name, phone, role, status: 'invited' }));
    const msg = encodeURIComponent('Hello ' + U.firstName(name) + ', I invited you to follow ' + pt.hh().name + '\'s care on BUSHEMI.');
    D.clear('inv'); D.clear('inv_err');
    BV.UI.sheetBody('<div class="center"><div class="tick">' + I('check') + '</div><h2>Invitation saved</h2><p class="muted mt-2">In the live product we would text ' + esc(U.firstName(name)) + ' a secure link. In this prototype nothing is sent, but you can tell them yourself:</p><a class="btn green block mt-3" target="_blank" rel="noopener" href="https://wa.me/?text=' + msg + '">' + I('wa', 'sm') + 'Open WhatsApp</a><button class="btn secondary block mt-2" data-act="ui.closeSheet">Done</button></div>');
  });
  BV.act('fam.edit', v => {
    const m = pt.hh().members.find(x => x.id === v);
    BV.UI.sheet('<h2>' + esc(m.name) + '</h2><div class="lab mt-3">Access</div>' + C.choice([['viewer', 'View only'], ['manager', 'Can book']], m.role, 'fam.role', ' data-m="' + m.id + '"') + '<button class="btn danger-o block mt-4" data-act="fam.remove" data-v="' + m.id + '">Remove from family</button>', { label: 'Edit access' });
  });
  BV.act('fam.role', (v, el) => { BV.Store.update(s => { s.households.find(h => h.id === pt.hh().id).members.find(x => x.id === el.dataset.m).role = v; }); BV.acts['fam.edit'](el.dataset.m); });
  BV.act('fam.remove', v => { BV.Store.update(s => { const h = s.households.find(x => x.id === pt.hh().id); h.members = h.members.filter(x => x.id !== v); }); BV.UI.closeSheet(); BV.UI.toast('Removed'); });

  BV.proute('/care', care);
  BV.proute('/care/meds', meds);
  BV.proute('/care/vitals', vitals);
  BV.proute('/care/history', history);
  BV.proute('/family', family);
  BV.proute('/messages', BV.shared.inboxView);
  BV.proute('/chat/:id', BV.shared.chatView);
  BV.proute('/notifications', BV.shared.notificationsView);
})(window.BV);
