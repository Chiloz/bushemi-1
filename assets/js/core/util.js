/* BUSHEMI v3 · core/util.js
   Small, dependency-free helpers shared by every screen. Exposed as BV.u */
window.BV = window.BV || {};
(function (BV) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => 'K' + Math.round(n || 0).toLocaleString('en-US');
  let _n = 0;
  const uid = p => (p || 'id') + '_' + Date.now().toString(36) + (++_n).toString(36) + Math.random().toString(36).slice(2, 5);
  const pad = n => String(n).padStart(2, '0');

  /* ---------- dates (all local time, keys are YYYY-MM-DD) ---------- */
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WD_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const today = () => startOfDay(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseKey = k => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const wdIndex = d => (d.getDay() + 6) % 7; // Monday = 0
  const diffDays = (k) => Math.round((parseKey(k) - today()) / 86400000);
  const fmtDay = d => WD[wdIndex(d)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  const relDay = k => {
    const n = diffDays(k);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    return fmtDay(parseKey(k));
  };
  const mins = t => { const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const when = (k, t) => relDay(k) + (t ? ', ' + t : '');
  const slotTs = (k, t) => { const d = parseKey(k); const m = mins(t || '00:00'); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d.getTime(); };
  const ago = ts => {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    const d = Math.floor(s / 86400);
    return d === 1 ? 'Yesterday' : d + ' days ago';
  };
  const clock = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const until = ts => {
    const m = Math.round((ts - Date.now()) / 60000);
    if (m <= 0) return 'now';
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  };

  /* ---------- misc ---------- */
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const hash = s => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const plural = (n, a, b) => n === 1 ? a : (b || a + 's');
  const sum = a => a.reduce((x, y) => x + y, 0);
  const initials = n => String(n).replace(/^(Dr\.?|Mr|Mrs|Ms|Sr)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const firstName = n => String(n).replace(/^(Dr\.?|Mr|Mrs|Ms|Sr)\s+/i, '').split(/\s+/)[0];
  const get = (o, path, def) => { const v = String(path).split('.').reduce((a, k) => a == null ? undefined : a[k], o); return v === undefined ? def : v; };
  const set = (o, path, v) => { const ks = String(path).split('.'); let c = o; ks.forEach((k, i) => { if (i === ks.length - 1) c[k] = v; else c = c[k] = c[k] || {}; }); return o; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* Avatar: initials on a calm gradient. Deliberately no stock photos: a healthcare product
     must not show real faces next to made-up names and "verified" ticks. */
  function avatar(name, size, ring) {
    size = size || 44;
    const h = 175 + (hash(name) % 90);
    const bg = 'linear-gradient(135deg,hsl(' + h + ',52%,38%),hsl(' + (h + 28) + ',58%,50%))';
    return '<span class="avatar' + (ring ? ' ring' : '') + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.38) + 'px;background:' + bg + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
  }

  BV.u = { $, $$, esc, money, uid, pad, WD, WD_LONG, MON, startOfDay, today, addDays, dkey, parseKey, wdIndex, diffDays, fmtDay, relDay, mins, hhmm, when, slotTs, ago, clock, until, clamp, hash, clone, plural, sum, initials, firstName, get, set, debounce, avatar };
})(window.BV);
