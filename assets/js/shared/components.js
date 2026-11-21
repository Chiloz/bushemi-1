/* BUSHEMI v3 · shared/components.js
   Reusable pieces of interface used by BOTH experiences. Each function returns an HTML string.
   The managed / independent distinction is rendered here, once, so it looks the same everywhere. */
(function (BV) {
  'use strict';
  const U = BV.u, esc = U.esc, I = BV.icon;

  const MARK = '<svg class="mark" viewBox="0 0 100 112" aria-hidden="true"><polygon points="50,3 93,28 93,74 7,74 7,28" fill="currentColor"/><path d="M42 30h16v14h14v16H58v0H42V60H28V44h14z" fill="#fff"/><polygon points="7,79 93,79 50,109" fill="#1B7F2A"/></svg>';

  const C = {
    MARK,
    icon: I,

    /* ---------- structure ---------- */
    topbar(o) {
      const back = o.back === false ? '' :
        '<button class="icon-btn" data-act="back" data-v="' + esc(o.back || '') + '" aria-label="Back">' + I('back') + '</button>';
      return '<header class="topbar">' + back + '<div class="topbar-text"><h1 class="topbar-title">' + esc(o.title) + '</h1>' + (o.sub ? '<p class="topbar-sub">' + esc(o.sub) + '</p>' : '') + '</div>' + (o.right ? '<div class="topbar-right">' + o.right + '</div>' : '') + '</header>';
    },
    section(title, linkText, act, v) {
      return '<div class="section-h"><h2>' + esc(title) + '</h2>' + (linkText ? '<button class="link" data-act="' + act + '" data-v="' + esc(v || '') + '">' + esc(linkText) + '</button>' : '') + '</div>';
    },
    kv(label, value) { return '<div class="kv"><span>' + esc(label) + '</span><b>' + value + '</b></div>'; },

    /* ---------- the hybrid model, made visible ---------- */
    badgeModel(model, short) {
      if (model === 'managed') return '<span class="badge managed" title="Arranged and managed by BUSHEMI">' + MARK + (short ? 'BUSHEMI Care' : 'BUSHEMI Care Team') + '</span>';
      return '<span class="badge independent" title="An independent professional on the BUSHEMI marketplace">' + I('user', 'sm') + 'Independent</span>';
    },
    modelLine(model) {
      return model === 'managed' ? 'Arranged and managed by BUSHEMI' : 'Independent professional on BUSHEMI';
    },
    /* Plain-language explainer of who is responsible for what */
    modelFacts(model) {
      const rows = model === 'managed' ? [
        ['BUSHEMI picks the professional', 'We match the best verified team member for you.'],
        ['One all-inclusive price', 'No separate fees. Pay after the visit if you prefer.'],
        ['We stand behind the visit', 'If we cannot make it, we find a replacement. A clinical lead reviews the report.'],
        ['A care coordinator', 'One place to message if anything changes.']
      ] : [
        ['You choose the professional', 'Compare profiles, ratings and prices, then book the one you like.'],
        ['They set their own price', 'You also pay a small BUSHEMI service fee for checks, secure payment and support.'],
        ['They accept your request', 'Your payment is only held until they confirm. Declined or ignored requests are released.'],
        ['The professional is responsible for the care', 'BUSHEMI verifies them and helps if something goes wrong.']
      ];
      return '<ul class="facts">' + rows.map(r => '<li>' + I('check', 'sm') + '<div><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div></li>').join('') + '</ul>';
    },

    verifyBadge(pro) {
      const v = BV.verify.summary(pro);
      const ic = v.status === 'verified' ? 'shieldcheck' : 'shield';
      return '<span class="badge ' + v.tone + '">' + I(ic, 'sm') + esc(v.label) + '</span>';
    },
    stars(r) {
      return '<span class="stars" role="img" aria-label="' + r + ' out of 5">' + I('star', 'sm') + '<b>' + (r ? r.toFixed(1) : 'New') + '</b></span>';
    },
    statusPill(b, role) {
      const i = BV.booking.info(b, role);
      return '<span class="badge ' + i.tone + '">' + esc(i.label) + '</span>';
    },
    paymentLabel(b) {
      const st = b.payment.state;
      const map = { held: 'Held securely until the visit (simulated)', paid: 'Paid (simulated)', released: 'Payment hold released (simulated)', pay_after: 'Pay after the visit', due: 'Payment due', fee_charged: 'Late-cancellation fee charged (simulated)', unpaid: 'Not paid' };
      return map[st] || st;
    },

    /* ---------- provider presentation ---------- */
    priceText(pro, svc) {
      if (pro.model === 'managed') return '<b>' + U.money(svc.managedPrice) + '</b><small>all-inclusive</small>';
      const rate = BV.pricing.rateOf(pro, svc.id), fee = Math.round(rate * BV.config.fees.independentServicePct / 100);
      return '<b>' + U.money(rate) + '</b><small>+ ' + U.money(fee) + ' fee</small>';
    },
    provCard(pro, o) {
      o = o || {};
      const s = BV.state(), svc = o.svc || BV.rules.primarySvc(pro), r = BV.rules.rating(pro, s);
      const next = o.next === undefined ? BV.avail.nextAvailable(pro, svc, s) : o.next;
      const nextTxt = next ? 'Next: ' + U.when(next.date, next.time) : 'No free times soon';
      const where = svc.mode === 'video' ? 'Video call' : pro.areas.slice(0, 2).join(', ') + (pro.areas.length > 2 ? ' +' + (pro.areas.length - 2) : '');
      return '<article class="prov-card" data-act="nav" data-v="/pro/' + pro.id + (o.svc ? '?svc=' + o.svc.id : '') + '" role="button" tabindex="0" aria-label="' + esc(pro.name) + ', ' + esc(pro.title) + '">' +
        U.avatar(pro.name, 56) +
        '<div class="prov-main"><div class="prov-top"><h3>' + esc(pro.name) + '</h3></div>' +
        '<p class="muted small">' + esc(pro.title.replace(' · BUSHEMI Care Team', '').replace(' · BUSHEMI Clinic', '')) + '</p>' +
        '<div class="prov-meta">' + C.stars(r.rating) + '<span class="muted small">(' + r.count + ')</span><span class="dot-sep"></span><span class="muted small">' + esc(where) + '</span></div>' +
        '<div class="prov-badges">' + C.badgeModel(pro.model, true) + C.verifyBadge(pro) + '</div>' +
        '<p class="small ' + (next ? 'ok-text' : 'muted') + '">' + I('clock', 'sm') + esc(nextTxt) + '</p></div>' +
        '<div class="prov-price">' + C.priceText(pro, svc) + '</div>' +
        (o.compare ? '<label class="cmp" data-stop="1"><input type="checkbox" data-act="cmp.toggle" data-v="' + pro.id + '" ' + (o.compare.on ? 'checked' : '') + ' aria-label="Compare ' + esc(pro.name) + '"><span>Compare</span></label>' : '') +
        '</article>';
    },
    priceLines(q) {
      return '<div class="price-lines">' + q.lines.map(l => '<div class="pl ' + (l.tone || '') + '"><div><span>' + esc(l.label) + '</span>' + (l.note ? '<small>' + esc(l.note) + '</small>' : '') + '</div><b>' + (l.amount < 0 ? '−' : '') + U.money(Math.abs(l.amount)) + '</b></div>').join('') +
        '<div class="pl total"><span>Total</span><b>' + U.money(q.total) + '</b></div></div>';
    },

    /* ---------- progress ---------- */
    journey(b) {
      const j = BV.booking.journey(b);
      return '<ol class="journey" aria-label="Booking progress">' + j.map(s => '<li class="j-step ' + s.state + '"><i>' + (s.state === 'done' ? I('check', 'sm') : '') + '</i><span>' + esc(s.label) + '</span></li>').join('') + '</ol>';
    },
    timeline(b) {
      const rows = b.timeline.slice().reverse();
      return '<ul class="tl">' + rows.map((t, i) => '<li class="' + (i === 0 ? 'now' : 'done') + '"><i></i><div><b>' + esc(t.label) + '</b><small>' + esc(U.relDay(U.dkey(new Date(t.ts)))) + ', ' + U.clock(t.ts) + (t.by === 'care_team' ? ' · BUSHEMI Care Team' : '') + '</small></div></li>').join('') + '</ul>';
    },
    spark(vals, color) {
      if (vals.length < 2) return '';
      const w = 120, h = 36, mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = (mx - mn) || 1;
      const pts = vals.map((v, i) => [(i * w / (vals.length - 1)).toFixed(1), (h - 5 - ((v - mn) / r) * (h - 10)).toFixed(1)]);
      const l = pts.map(p => p.join(',')).join(' '), e = pts[pts.length - 1];
      return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polygon points="0,' + h + ' ' + l + ' ' + w + ',' + h + '" fill="' + (color || 'var(--brand)') + '" opacity=".12"/><polyline points="' + l + '" fill="none" stroke="' + (color || 'var(--brand)') + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + e[0] + '" cy="' + e[1] + '" r="3.4" fill="' + (color || 'var(--brand)') + '"/></svg>';
    },

    /* ---------- states ---------- */
    empty(icon, title, text, cta) {
      return '<div class="empty">' + '<span class="empty-ic">' + I(icon) + '</span><h3>' + esc(title) + '</h3>' + (text ? '<p class="muted">' + esc(text) + '</p>' : '') +
        (cta ? '<button class="btn primary sm" data-act="' + cta.act + '" data-v="' + esc(cta.v || '') + '">' + esc(cta.label) + '</button>' : '') + '</div>';
    },
    skeleton(n) {
      let h = '';
      for (let i = 0; i < (n || 3); i++) h += '<div class="skel-card"><span class="skel round"></span><div><span class="skel line w60"></span><span class="skel line w40"></span><span class="skel line w80"></span></div></div>';
      return '<div class="skel-wrap" aria-busy="true" aria-label="Loading">' + h + '</div>';
    },
    errorState(title, text, label, act) {
      return '<div class="empty err">' + '<span class="empty-ic">' + I('alert') + '</span><h3>' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p>' +
        (label ? '<button class="btn primary sm" data-act="' + act + '">' + esc(label) + '</button>' : '') + '</div>';
    },
    simNote(text) {
      return '<p class="sim-note">' + I('info', 'sm') + '<span>' + esc(text) + '</span></p>';
    },

    /* ---------- form pieces (values come from Draft so re-rendering never loses typing) ---------- */
    input(o) {
      const v = o.value !== undefined ? o.value : BV.Draft.get(o.draft, '');
      return '<div class="field' + (o.err ? ' has-err' : '') + '"><label for="' + o.id + '">' + esc(o.label) + (o.opt ? ' <span class="muted">(optional)</span>' : '') + '</label>' +
        (o.prefix ? '<div class="prefixed"><span>' + esc(o.prefix) + '</span>' : '') +
        '<input class="input" id="' + o.id + '" type="' + (o.type || 'text') + '"' + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
        ' placeholder="' + esc(o.placeholder || '') + '" value="' + esc(v) + '"' + (o.draft ? ' data-draft="' + o.draft + '"' : '') + (o.onInput ? ' data-on-input="' + o.onInput + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.err ? ' aria-invalid="true" aria-describedby="' + o.id + '-e"' : '') + '>' +
        (o.prefix ? '</div>' : '') + (o.hint ? '<small class="muted">' + esc(o.hint) + '</small>' : '') + (o.err ? '<small class="err-text" id="' + o.id + '-e" role="alert">' + esc(o.err) + '</small>' : '') + '</div>';
    },
    textarea(o) {
      const v = BV.Draft.get(o.draft, '');
      return '<div class="field"><label for="' + o.id + '">' + esc(o.label) + (o.opt ? ' <span class="muted">(optional)</span>' : '') + '</label><textarea class="input" id="' + o.id + '" rows="' + (o.rows || 3) + '" placeholder="' + esc(o.placeholder || '') + '" data-draft="' + o.draft + '">' + esc(v) + '</textarea>' + (o.hint ? '<small class="muted">' + esc(o.hint) + '</small>' : '') + '</div>';
    },
    select(o) {
      const v = BV.Draft.get(o.draft, o.def || '');
      return '<div class="field"><label for="' + o.id + '">' + esc(o.label) + '</label><select class="input" id="' + o.id + '" data-draft="' + o.draft + '"' + (o.onInput ? ' data-on-input="' + o.onInput + '"' : '') + '>' +
        o.options.map(x => { const val = Array.isArray(x) ? x[0] : x, lab = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select></div>';
    },
    /* chip group that sets one value through an action */
    choice(opts, cur, act, extra) {
      return '<div class="chips" role="radiogroup">' + opts.map(x => {
        const v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x;
        return '<button class="chip' + (String(cur) === String(v) ? ' on' : '') + '" role="radio" aria-checked="' + (String(cur) === String(v)) + '" data-act="' + act + '" data-v="' + esc(v) + '"' + (extra || '') + '>' + esc(l) + '</button>';
      }).join('') + '</div>';
    },
    multi(opts, cur, act) {
      return '<div class="chips">' + opts.map(x => '<button class="chip' + (cur.includes(x) ? ' on' : '') + '" aria-pressed="' + cur.includes(x) + '" data-act="' + act + '" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>';
    },
    toggle(o) {
      return '<div class="toggle-row"><div><b>' + esc(o.label) + '</b>' + (o.sub ? '<small class="muted">' + esc(o.sub) + '</small>' : '') + '</div>' +
        '<button class="switch' + (o.on ? ' on' : '') + '" role="switch" aria-checked="' + !!o.on + '" aria-label="' + esc(o.label) + '" data-act="' + o.act + '" data-v="' + esc(o.v || '') + '"><i></i></button></div>';
    },
    steps(cur, labels) {
      return '<div class="steps" role="progressbar" aria-valuemin="1" aria-valuemax="' + labels.length + '" aria-valuenow="' + (cur + 1) + '" aria-label="Step ' + (cur + 1) + ' of ' + labels.length + ': ' + esc(labels[cur]) + '">' +
        labels.map((l, i) => '<span class="' + (i < cur ? 'done' : i === cur ? 'now' : '') + '"></span>').join('') + '</div><p class="steps-label muted small">Step ' + (cur + 1) + ' of ' + labels.length + ' · ' + esc(labels[cur]) + '</p>';
    },
    stat(n, label) { return '<div class="stat"><b>' + n + '</b><span>' + esc(label) + '</span></div>'; },
    callBtn(label, cls) {
      const n = BV.config.careLine;
      return n ? '<a class="btn ' + (cls || 'secondary') + '" href="tel:' + n.replace(/\s/g, '') + '">' + I('phone', 'sm') + esc(label) + '</a>'
        : '<button class="btn ' + (cls || 'secondary') + '" data-act="ui.careLineUnset">' + I('phone', 'sm') + esc(label) + '</button>';
    }
  };
  BV.act('ui.careLineUnset', () => BV.UI.sheet('<h2>Care line not set</h2><p class="muted mt-2">This prototype does not contain a real BUSHEMI phone number. Add one in <code>assets/js/data/config.js</code> (<code>careLine</code>) and this button will dial it.</p><button class="btn primary block mt-4" data-act="ui.closeSheet">OK</button>', { label: 'Care line not set' }));

  BV.comp = C;
})(window.BV);
