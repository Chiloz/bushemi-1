/* BUSHEMI v3 · core/engine.js
   The small runtime every screen sits on:
     Store    one shared JSON state in localStorage (patient + professional apps read/write the SAME records)
     Session  who is signed in on this device, per app
     Draft    form-in-progress values, so re-rendering never loses what someone typed
     Presence lets each app know if the other app is open (real two-way demo vs. simulated replies)
     Net      simulated connectivity (normal / slow / offline) so weak-network states are testable
     UI       sheets, toasts, banners
     Router   hash router (works on GitHub Pages with no server rules)
     shell    boots an app: tab bar, prototype ribbon, offline banner, first render              */
(function (BV) {
  'use strict';
  const U = BV.u, $ = U.$, esc = U.esc;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  BV.ls = ls;

  /* ---------------- Store ---------------- */
  const KEY = 'bv3.state';
  const listeners = [];
  let cache = null, mem = null;
  function emit(src) { listeners.slice().forEach(cb => { try { cb(src); } catch (e) { console.error(e); } }); }

  const Store = {
    load() {
      let s = null;
      const raw = ls.get(KEY);
      if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
      if (!s && mem) s = mem;
      if (!s || s.schema !== BV.config.schema) { s = BV.seed.create(); this._save(s); }
      cache = s;
      return s;
    },
    get() { return cache || this.load(); },
    _save(s) { const j = JSON.stringify(s); if (!ls.set(KEY, j)) mem = s; cache = s; },
    /* Always re-reads the latest saved state before applying a change, so two open apps can't overwrite each other. */
    update(fn) { const s = this.load(); fn(s); s.rev = (s.rev || 0) + 1; this._save(s); emit('local'); return s; },
    reset() {
      ['bv3.session.patient', 'bv3.session.pro', 'bv3.draft.patient', 'bv3.draft.pro'].forEach(ls.del);
      const s = BV.seed.create(); this._save(s); emit('reset'); return s;
    },
    on(cb) { listeners.push(cb); }
  };
  window.addEventListener('storage', e => { if (e.key === KEY) { cache = null; emit('remote'); } });

  /* ---------------- Session ---------------- */
  const Session = {
    _k() { return 'bv3.session.' + BV.app; },
    read() { try { return JSON.parse(ls.get(this._k()) || '{}'); } catch (e) { return {}; } },
    get(k, d) { const v = this.read()[k]; return v === undefined ? d : v; },
    set(k, v) { const o = this.read(); o[k] = v; ls.set(this._k(), JSON.stringify(o)); },
    clear() { ls.del(this._k()); }
  };

  /* ---------------- Draft ---------------- */
  const Draft = {
    _d: null,
    _k() { return 'bv3.draft.' + BV.app; },
    all() { if (!this._d) { try { this._d = JSON.parse(ls.get(this._k()) || '{}'); } catch (e) { this._d = {}; } } return this._d; },
    get(p, d) { return U.get(this.all(), p, d); },
    set(p, v) { U.set(this.all(), p, v); this._save(); },
    clear(prefix) {
      if (!prefix) { this._d = {}; } else {
        const parts = prefix.split('.'); let o = this.all();
        for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]] || {}; }
        delete o[parts[parts.length - 1]];
      }
      this._save();
    },
    _save() { ls.set(this._k(), JSON.stringify(this._d || {})); }
  };

  /* ---------------- Presence ---------------- */
  const Presence = {
    beat(app) { ls.set('bv3.presence.' + app, String(Date.now())); },
    active(app) { const t = +ls.get('bv3.presence.' + app); return !!t && Date.now() - t < 9000; },
    start(app) { const b = () => this.beat(app); b(); setInterval(b, 3000); }
  };

  /* ---------------- Net (simulated connectivity) ---------------- */
  const Net = {
    _k() { return 'bv3.net.' + BV.app; },
    mode() { return ls.get(this._k()) || 'normal'; },
    setMode(m) { ls.set(this._k(), m); this.sync(); emit('net'); },
    online() { return this.mode() !== 'offline' && navigator.onLine !== false; },
    /* Runs fn after a realistic delay; rejects with {offline:true} when offline. */
    call(fn) {
      return new Promise((res, rej) => {
        if (!this.online()) { setTimeout(() => rej(Object.assign(new Error('offline'), { offline: true })), 450); return; }
        const d = this.mode() === 'slow' ? 2200 + Math.random() * 1200 : 300 + Math.random() * 300;
        setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, d);
      });
    },
    sync() {
      const m = this.mode();
      if (!this.online()) UI.banner('net', BV.icon('wifioff') + '<span><b>You are offline.</b> You can browse saved information. Messages will wait and send when you are back.</span>', 'warn');
      else if (m === 'slow') UI.banner('net', BV.icon('wifioff') + '<span><b>Slow connection.</b> Things may take a little longer.</span>', 'info');
      else UI.banner('net', null);
      if (this._last === false && this.online()) { BV.flushOutbox && BV.flushOutbox(); }
      this._last = this.online();
    }
  };
  window.addEventListener('online', () => Net.sync());
  window.addEventListener('offline', () => Net.sync());

  /* ---------------- UI: sheets, toasts, banners ---------------- */
  let lastFocus = null, sheetClose = null, confirmYes = null;
  const UI = {
    toast(msg, tone) {
      const root = $('#toast-root'); if (!root) return;
      const t = document.createElement('div');
      t.className = 'toast ' + (tone || '');
      t.textContent = msg;
      root.appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2800);
    },
    sheet(html, opts) {
      opts = opts || {};
      const root = $('#sheet-root');
      lastFocus = document.activeElement;
      sheetClose = opts.onClose || null;
      root.innerHTML = '<div class="sheet-backdrop" data-act="ui.closeSheet"></div>' +
        '<div class="sheet' + (opts.tall ? ' tall' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.label || 'Dialog') + '" tabindex="-1">' +
        '<div class="sheet-grab"></div><button class="sheet-x" data-act="ui.closeSheet" aria-label="Close">' + BV.icon('close') + '</button>' +
        '<div class="sheet-body">' + html + '</div></div>';
      root.classList.add('open');
      setTimeout(() => {
        const first = root.querySelector('[autofocus]') || root.querySelector('.sheet-body input,.sheet-body textarea,.sheet-body select');
        (first || root.querySelector('.sheet')).focus({ preventScroll: true });
      }, 60);
    },
    sheetBody(html) { const b = $('#sheet-root .sheet-body'); if (b) b.innerHTML = html; },
    sheetOpen() { const r = $('#sheet-root'); return !!(r && r.classList.contains('open')); },
    closeSheet() {
      const root = $('#sheet-root'); if (!root) return;
      root.classList.remove('open'); root.innerHTML = '';
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      const cb = sheetClose; sheetClose = null; if (cb) cb();
    },
    confirm(o) {
      confirmYes = o.onYes;
      UI.sheet('<h2>' + esc(o.title) + '</h2>' + (o.text ? '<p class="muted mt-2">' + esc(o.text) + '</p>' : '') +
        '<div class="stack mt-4"><button class="btn ' + (o.tone === 'danger' ? 'danger' : 'primary') + ' block" data-act="ui.confirmYes">' + esc(o.yes || 'Confirm') + '</button>' +
        '<button class="btn secondary block" data-act="ui.closeSheet">' + esc(o.no || 'Cancel') + '</button></div>', { label: o.title });
    },
    banner(id, html, tone) {
      const root = $('#banners'); if (!root) return;
      let el = root.querySelector('[data-b="' + id + '"]');
      if (!html) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.dataset.b = id; root.appendChild(el); }
      el.className = 'banner ' + (tone || 'info'); el.setAttribute('role', 'status'); el.innerHTML = html;
    }
  };

  /* ---------------- action delegation ---------------- */
  const acts = {};
  BV.act = (name, fn) => { acts[name] = fn; };
  BV.acts = acts;
  BV.act('ui.closeSheet', () => UI.closeSheet());
  BV.act('ui.confirmYes', () => { const f = confirmYes; confirmYes = null; UI.closeSheet(); if (f) f(); });
  BV.act('router.refresh', () => Router.refresh());
  BV.act('nav', v => Router.go(v));
  BV.act('tab', v => Router.go(v, { replace: true }));
  BV.act('back', v => Router.back(v));

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    const stop = e.target.closest('[data-stop]');
    if (stop && el && !stop.contains(el)) return;   // e.g. clicking a "Compare" label must not open the card behind it
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = acts[el.dataset.act];
    if (!fn) { console.warn('No action:', el.dataset.act); return; }
    if (el.tagName !== 'A' || el.getAttribute('href') == null) e.preventDefault();
    fn(el.dataset.v, el, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && UI.sheetOpen()) { UI.closeSheet(); return; }
    if (e.key === 'Tab' && UI.sheetOpen()) {
      const f = Array.from(document.querySelectorAll('#sheet-root button,#sheet-root input,#sheet-root textarea,#sheet-root select,#sheet-root a[href]')).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-act][role="button"]')) { e.preventDefault(); e.target.click(); }
  });
  /* two-way binding for inputs: data-draft="path.in.draft" */
  function onField(e) {
    const el = e.target;
    if (el.dataset && el.dataset.draft) Draft.set(el.dataset.draft, el.type === 'checkbox' ? el.checked : el.value);
    if (el.dataset && el.dataset.onInput && acts[el.dataset.onInput] && (e.type === 'input' || el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file')) {
      acts[el.dataset.onInput](el.type === 'checkbox' ? el.checked : el.value, el, e);
    }
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);

  /* ---------------- Router ---------------- */
  const Router = {
    routes: [], cur: { path: '', params: {}, query: {} }, memo: {}, _pop: false, timers: [],
    define(pattern, fn) {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z]+)/g, (m, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
      this.routes.push({ pattern, re, keys, fn });
    },
    parse() {
      const h = location.hash.replace(/^#/, '') || BV.startPath || '/';
      const qi = h.indexOf('?'), path = qi > -1 ? h.slice(0, qi) : h, query = {};
      if (qi > -1) new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { query[k] = v; });
      return { path, query };
    },
    match(path) {
      for (const r of this.routes) {
        const m = r.re.exec(path);
        if (m) { const params = {}; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); return { r, params }; }
      }
      return null;
    },
    go(path, opt) {
      opt = opt || {};
      if (UI.sheetOpen()) UI.closeSheet();
      const st = { i: ((history.state && history.state.i) || 0) + (opt.replace ? 0 : 1) };
      try { history[opt.replace ? 'replaceState' : 'pushState'](st, '', '#' + path); } catch (e) { location.hash = '#' + path; return; }
      this.render(false);
    },
    back(fallback) {
      if (UI.sheetOpen()) UI.closeSheet();
      if (history.state && history.state.i > 0) history.back(); else this.go(fallback || BV.startPath || '/', { replace: true });
    },
    refresh() { this.render(true); },
    interval(fn, ms) { this.timers.push(setInterval(fn, ms)); },
    render(keep) {
      const screen = $('#screen'); if (!screen) return;
      const { path, query } = this.parse();
      let m = this.match(path);
      if (!m) m = this.match('/404');
      if (!keep) { this.timers.forEach(clearInterval); this.timers = []; }
      if (this.cur.path) this.memo[this.cur.path] = screen.scrollTop;
      const prevTop = screen.scrollTop;
      const ae = document.activeElement;
      let fx = null;
      if (keep && ae && screen.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) {
        fx = { id: ae.id, draft: ae.dataset && ae.dataset.draft, start: ae.selectionStart, end: ae.selectionEnd };
      }
      this.cur = { path, params: m ? m.params : {}, query };
      let out;
      try { out = m.r.fn({ params: m.params, query, path }); } catch (e) {
        console.error(e);
        out = { html: BV.comp.errorState('Something went wrong', 'This screen could not load. Please try again.', 'Try again', 'router.refresh'), tab: null };
      }
      if (typeof out === 'string') out = { html: out };
      screen.innerHTML = out.html;
      screen.className = 'screen' + (out.cls ? ' ' + out.cls : '') + (keep ? '' : ' enter');
      BV.shell.updateTabs(out.tab);
      screen.scrollTop = keep ? prevTop : (this._pop ? (this.memo[path] || 0) : 0);
      document.title = (out.title ? out.title + ' · ' : '') + (BV.shell.cfg ? BV.shell.cfg.name : 'BUSHEMI');
      if (!keep) { screen.focus({ preventScroll: true }); }
      if (fx) {
        let t = fx.id ? document.getElementById(fx.id) : null;
        if (!t && fx.draft) t = screen.querySelector('[data-draft="' + fx.draft + '"]');
        if (t) { t.focus({ preventScroll: true }); try { t.setSelectionRange(fx.start, fx.end); } catch (e) { /* not selectable */ } }
      }
      this._pop = false;
      if (out.onMount) out.onMount();
    }
  };
  window.addEventListener('popstate', () => { Router._pop = true; Router.render(false); });

  /* ---------------- shell ---------------- */
  const shell = {
    cfg: null,
    init(cfg) {
      this.cfg = cfg;
      BV.app = cfg.app; BV.startPath = cfg.start;
      document.documentElement.dataset.app = cfg.app;
      const embedded = (function () { try { return window.self !== window.top || /[?&]embed=1/.test(location.search); } catch (e) { return true; } })();
      if (embedded) document.documentElement.classList.add('embedded');
      Presence.start(cfg.app);
      const rb = $('#ribbon');
      if (rb) rb.innerHTML = '<span class="ribbon-dot"></span><span><b>Prototype</b> · demo data, nothing is real</span><button class="ribbon-btn" data-act="demo.open">' + BV.icon('tool', 'sm') + 'Demo tools</button>';
      Net.sync();
      Store.on(src => {
        if (src === 'net') { Router.refresh(); return; }
        if (src === 'reset' || src === 'remote') {
          const st = Store.get();
          if (Session.get('epoch') && Session.get('epoch') !== st.epoch) { Session.clear(); Draft.clear(); Draft._d = null; if (cfg.onReset) cfg.onReset(); return; }
        }
        clearTimeout(this._rt);
        this._rt = setTimeout(() => Router.refresh(), 30);
      });
      if (!history.state) { try { history.replaceState({ i: 0 }, '', location.hash || '#' + cfg.start); } catch (e) { /* ignore */ } }
      Router.render(false);
    },
    updateTabs(active) {
      const tb = $('#tabbar'), app = $('.app-shell');
      if (!tb || !this.cfg) return;
      if (!active) { tb.hidden = true; app.classList.add('no-tabs'); return; }
      tb.hidden = false; app.classList.remove('no-tabs');
      const badges = this.cfg.badges ? this.cfg.badges() : {};
      tb.innerHTML = this.cfg.tabs.map(t =>
        '<button class="tab' + (t.id === active ? ' on' : '') + '" data-act="tab" data-v="' + t.path + '"' + (t.id === active ? ' aria-current="page"' : '') + '>' +
        BV.icon(t.icon) + '<span>' + esc(t.label) + '</span>' + (badges[t.id] ? '<i class="badge-n">' + badges[t.id] + '</i>' : '') + '</button>').join('');
    }
  };

  BV.Store = Store; BV.Session = Session; BV.Draft = Draft; BV.Presence = Presence; BV.Net = Net; BV.UI = UI; BV.Router = Router; BV.shell = shell;
  BV.route = (p, fn) => Router.define(p, fn);
  BV.state = () => Store.get();
})(window.BV);
