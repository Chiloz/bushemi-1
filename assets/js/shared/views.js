/* BUSHEMI v3 · shared/views.js
   Screens that exist in both apps with the same behaviour: messaging, notifications, demo tools, 404.
   The app passes its identity ({role, id}) so the same code serves patient and professional. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon, C = BV.comp;

  /* ---------------- identity helper ---------------- */
  const me = () => BV.app === 'patient'
    ? { role: 'patient', id: BV.Session.get('household') }
    : { role: 'pro', id: BV.Session.get('pro') };
  const meName = (s) => {
    if (BV.app === 'patient') { const hh = s.households.find(h => h.id === BV.Session.get('household')); const u = hh && hh.members.find(m => m.id === BV.Session.get('user')); return u ? u.name : 'You'; }
    const p = s.pros.find(x => x.id === BV.Session.get('pro')); return p ? p.name : 'You';
  };
  BV.me = me;

  /* ---------------- messaging ---------------- */
  function counterpart(b, s) {
    if (BV.app === 'patient') {
      if (b.model === 'managed' && b.status === 'assigning') return { name: 'BUSHEMI Care Team', sub: 'Coordinating your booking', care: true };
      if (b.model === 'managed') { const p = b.pro && s.pros.find(x => x.id === b.pro); return { name: 'BUSHEMI Care Team', sub: p ? 'with ' + p.name : 'Your care coordinator', care: true }; }
      const p = s.pros.find(x => x.id === b.pro); return { name: p ? p.name : 'Professional', sub: p ? p.title : '' };
    }
    const r = s.recipients.find(x => x.id === b.recipient), hh = s.households.find(h => h.id === b.household);
    return { name: hh.members[0].name, sub: 'Booked for ' + U.firstName(r.name) };
  }
  const bookingLink = b => BV.app === 'patient' ? '/booking/' + b.id : '/request/' + b.id;

  function inboxView() {
    const s = BV.state(), m = me();
    const list = BV.msg.inbox(s, m.role, m.id);
    let body;
    if (!list.length) body = C.empty('chat', 'No conversations yet', BV.app === 'patient' ? 'When you book a visit, you can message your professional or the care team here.' : 'Conversations with patients appear here once you have a booking.');
    else body = '<div class="card" style="padding:4px 16px">' + list.map(x => {
      const cp = counterpart(x.b, s), svc = BV.svc(x.b.service);
      return '<button class="list-row" data-act="nav" data-v="/chat/' + x.b.id + '">' + (cp.care ? '<span class="ic-tile green">' + C.MARK.replace('class="mark"', 'class="mark" style="width:18px;height:20px;color:var(--green)"') + '</span>' : U.avatar(cp.name, 44)) +
        '<span class="grow"><b>' + esc(cp.name) + '</b><small>' + esc(svc.name) + ' · ' + U.relDay(x.b.date) + '</small><small style="color:' + (x.unread ? 'var(--ink)' : 'var(--muted)') + ';font-weight:' + (x.unread ? 650 : 400) + '">' + esc(x.last ? (x.last.from.role === m.role ? 'You: ' : '') + x.last.text : 'Say hello') + '</small></span>' +
        '<span style="text-align:right"><small>' + (x.last ? U.ago(x.last.ts) : '') + '</small>' + (x.unread ? '<span class="badge info" style="margin-top:4px">' + x.unread + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';
    return { html: C.topbar({ title: 'Messages', back: false }) + body, tab: 'messages', title: 'Messages' };
  }

  function chatView(p) {
    const s = BV.state(), m = me(), b = BV.booking.byId(s, p.params.id);
    if (!b) return { html: C.topbar({ title: 'Chat', back: '/messages' }) + C.empty('chat', 'Conversation not found', 'It may have been removed when the demo was reset.', { label: 'Back to messages', act: 'nav', v: '/messages' }), tab: 'messages' };
    const cp = counterpart(b, s), svc = BV.svc(b.service), thread = BV.msg.thread(s, b.id);
    BV.msg.markRead(b.id, m.role);
    const closed = BV.booking.CLOSED.includes(b.status) && b.status !== 'completed';
    const quick = BV.app === 'patient'
      ? ['Running a few minutes late', 'Please call me', 'The gate code is 1234', 'Thank you']
      : ['On my way', 'Running 10 minutes late', 'Please have the medicines ready', 'Thank you'];
    const bubbles = thread.length ? thread.map(x => {
      const mine = x.from.role === m.role;
      return '<div class="bub ' + (mine ? 'me' : 'them') + (x.state === 'queued' ? ' queued' : '') + '">' + (!mine ? '<small style="margin:0 0 3px;font-weight:700">' + esc(x.from.name || cp.name) + '</small>' : '') + esc(x.text) +
        '<small>' + U.clock(x.ts) + (x.state === 'queued' ? ' · waiting for signal' : '') + (x.simulated ? ' · demo reply' : '') + '</small></div>';
    }).join('') : '<div class="bub sys">No messages yet. Say hello.</div>';
    const html =
      '<div class="chat">' +
      '<div style="padding:0 var(--pad)">' + C.topbar({ title: cp.name, sub: cp.sub, back: bookingLink(b), right: '<button class="icon-btn" data-act="nav" data-v="' + bookingLink(b) + '" aria-label="Open booking">' + I('clipboard') + '</button>' }) + '</div>' +
      '<div class="callout" style="margin:0 var(--pad) 6px;font-size:.8rem">' + I('lock', 'sm') + '<span>' + esc(svc.name) + ' · ' + U.when(b.date, b.time) + '. Messages here are for this booking. For emergencies call ' + BV.config.emergencyNumber + '.</span></div>' +
      '<div class="chat-log" id="chat-log" aria-live="polite">' + bubbles + '</div>' +
      (closed ? '<div class="composer"><p class="muted small" style="padding:8px 0">This booking is ' + esc(BV.booking.info(b).label.toLowerCase()) + ', so the conversation is closed.</p></div>' :
        '<div class="quick">' + quick.map(q => '<button class="chip" data-act="chat.quick" data-v="' + esc(q) + '" data-b="' + b.id + '">' + esc(q) + '</button>').join('') + '</div>' +
        '<div class="composer"><input class="input" id="chat-in" placeholder="Write a message" aria-label="Message" autocomplete="off" data-draft="chat.' + b.id + '" value="' + esc(BV.Draft.get('chat.' + b.id, '')) + '" data-bid="' + b.id + '"><button class="btn primary" data-act="chat.send" data-v="' + b.id + '" aria-label="Send">' + I('send') + '</button></div>') +
      '</div>';
    return { html, cls: 'chatscreen', tab: null, title: cp.name, onMount() { const l = U.$('#chat-log'); if (l) l.scrollTop = l.scrollHeight; } };
  }
  function sendChat(bid, text) {
    const s = BV.state(), m = me();
    const from = { role: m.role, id: m.id, name: meName(s) };
    const r = BV.msg.send(bid, from, text);
    if (r === 'queued') BV.UI.toast('No signal. Message will send when you are back online.');
    return r;
  }
  BV.act('chat.send', v => {
    const text = BV.Draft.get('chat.' + v, '');
    if (!String(text).trim()) return;
    BV.Draft.clear('chat.' + v);
    const inp = U.$('#chat-in'); if (inp) inp.value = '';
    sendChat(v, text);
  });
  BV.act('chat.quick', (v, el) => sendChat(el.dataset.b, v));
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'chat-in') { e.preventDefault(); BV.acts['chat.send'](e.target.dataset.bid); }
  });

  /* ---------------- notifications ---------------- */
  function notificationsView() {
    const s = BV.state(), m = me();
    const list = BV.notif.list(s, m.role, m.id).sort((a, b) => b.ts - a.ts);
    const unread = list.filter(n => !n.read).length;
    const html = C.topbar({ title: 'Notifications', back: '/', right: unread ? '<button class="btn sm secondary" data-act="notif.readAll">Mark all read</button>' : '' }) +
      (list.length ? '<div class="card" style="padding:4px 16px">' + list.map(n =>
        '<button class="list-row" data-act="notif.open" data-v="' + n.id + '"><span class="ic-tile ' + (n.read ? '' : 'green') + '">' + I(n.read ? 'bell' : 'bell') + '</span><span class="grow"><b style="font-weight:' + (n.read ? 500 : 700) + '">' + esc(n.text) + '</b><small>' + U.ago(n.ts) + '</small></span>' + (n.read ? '' : '<i style="width:9px;height:9px;border-radius:50%;background:var(--brand)"></i>') + '</button>').join('') + '</div>'
        : C.empty('bell', 'You are all caught up', 'Updates about your bookings will appear here.'));
    return { html, tab: null, title: 'Notifications' };
  }
  BV.act('notif.readAll', () => { const m = me(); BV.notif.markAllRead(m.role, m.id); });
  BV.act('notif.open', v => {
    const m = me(), n = BV.state().notifications.find(x => x.id === v); if (!n) return;
    BV.Store.update(s => { const x = s.notifications.find(y => y.id === v); if (x) x.read = true; });
    if (n.link) BV.Router.go(n.link);
  });

  /* ---------------- 404 ---------------- */
  function notFound() {
    return { html: C.topbar({ title: 'Not found', back: '/' }) + C.empty('search', 'That page does not exist', 'The link may be old. Go back to the start.', { label: 'Go home', act: 'nav', v: '/' }), tab: null };
  }

  /* ---------------- demo tools ---------------- */
  function demoSheet() {
    const s = BV.state(), net = BV.Net.mode();
    const other = BV.app === 'patient' ? { href: '../pro/', label: 'Open the professional app' } : { href: '../patient/', label: 'Open the patient app' };
    const assigning = s.bookings.filter(b => b.status === 'assigning');
    const extras = (BV.demoExtras ? BV.demoExtras() : []);
    const html =
      '<h2>Demo tools</h2><p class="muted small mt-1">These controls are only for presenting the prototype. A real product would not have them.</p>' +
      '<div class="section-h" style="margin-top:18px"><h3>Connection</h3></div>' +
      C.choice([['normal', 'Normal'], ['slow', 'Slow'], ['offline', 'Offline']], net, 'demo.net') +
      '<p class="muted small mt-2">Try Offline, then send a message. It waits and goes out when you switch back.</p>' +
      (assigning.length ? '<div class="section-h"><h3>BUSHEMI Care Team console</h3></div><p class="muted small">Managed bookings are assigned automatically after a few seconds. You can do it now:</p><div class="stack mt-2">' +
        assigning.map(b => '<button class="btn secondary" data-act="demo.assign" data-v="' + b.id + '">Assign now: ' + esc(BV.svc(b.service).name) + ' · ' + U.relDay(b.date) + '</button>').join('') + '</div>' : '') +
      (extras.length ? '<div class="section-h"><h3>Scenarios</h3></div><div class="stack">' + extras.map((x, i) => '<button class="btn secondary" data-act="demo.extra" data-v="' + i + '">' + esc(x.label) + '</button>').join('') + '</div>' : '') +
      '<div class="section-h"><h3>Two phones, one system</h3></div><p class="muted small">Both apps share the same records. Open the other app in a second tab (or the landing page for a side-by-side view) and watch a booking move between them.</p>' +
      '<a class="btn secondary block mt-2" href="' + other.href + '" target="_blank" rel="noopener">' + esc(other.label) + '</a>' +
      '<a class="btn ghost block" href="../index.html" target="_self">Back to the overview</a>' +
      '<div class="section-h"><h3>Reset</h3></div><button class="btn danger-o block" data-act="demo.reset">Reset all demo data</button>';
    BV.UI.sheet(html, { label: 'Demo tools', tall: true });
  }
  BV.act('demo.open', demoSheet);
  BV.act('demo.net', v => { BV.Net.setMode(v); if (BV.UI.sheetOpen()) demoSheet(); });
  BV.act('demo.assign', v => { BV.booking.careTeamAssign(v); BV.UI.toast('Care team assigned a professional'); if (BV.UI.sheetOpen()) demoSheet(); });
  BV.act('demo.extra', v => { const x = BV.demoExtras()[+v]; BV.UI.closeSheet(); x.fn(); });
  BV.act('demo.reset', () => BV.UI.confirm({ title: 'Reset the demo?', text: 'All bookings, messages and changes go back to the starting data in both apps.', yes: 'Reset', tone: 'danger', onYes: () => { BV.Store.reset(); BV.UI.toast('Demo data reset'); } }));

  BV.shared = { inboxView, chatView, notificationsView, notFound, counterpart, me, meName };
})(window.BV);
