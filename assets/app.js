/* R. N. Electronics — core: state, helpers, icons, illustrations, capabilities */
(function () {
  'use strict';
  const RN = window.RN = window.RN || {};
  const BOOT = window.__RN_BOOT__ || {};
  RN.router = BOOT.router || 'hash';
  RN.base = BOOT.base || '/';
  RN.defaults = BOOT.content;
  RN.C = JSON.parse(JSON.stringify(BOOT.content));

  /* ---------- helpers ---------- */
  const $ = RN.$ = (s, r) => (r || document).querySelector(s);
  const $$ = RN.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = RN.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RN.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  RN.isLive = () => RN.C.settings.mode === 'live';
  RN.show = (it) => !!it && (!RN.isLive() || it.verified === true);
  RN.vis = (list) => (list || []).filter(RN.show);
  RN.srcText = (key) => (RN.C.sources && RN.C.sources[key]) || key || 'Unknown source';
  RN.flag = (it, label) => (it && !it.verified && !RN.isLive()) ? `<span class="flag" title="${esc('Not yet confirmed by R. N. Electronics. Source: ' + RN.srcText(it.source))}">${esc(label || 'Unverified')}</span>` : '';
  RN.cat = (id) => RN.C.categories.find(c => c.id === id);
  RN.prod = (id) => RN.C.products.find(p => p.id === id);
  RN.sol = (id) => RN.C.solutions.find(s => s.id === id);
  RN.ind = (id) => RN.C.industries.find(s => s.id === id);
  RN.uid = (() => { let n = 0; return () => 'u' + (++n).toString(36); })();
  RN.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  RN.fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  RN.inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* performance tier */
  RN.perf = (() => {
    const n = navigator, small = Math.min(screen.width, screen.height) < 700 || innerWidth < 760;
    const weak = (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 4) || (n.connection && n.connection.saveData);
    return { lite: !!(small || weak || !RN.fine), webgl: window.GLK ? GLK.supported() : false };
  })();

  RN.store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  RN.toast = (msg, bad) => {
    let t = $('#toast'); if (!t) return;
    t.textContent = msg; t.className = 'toast is-on' + (bad ? ' toast--bad' : '');
    clearTimeout(RN._tt); RN._tt = setTimeout(() => { t.className = 'toast' + (bad ? ' toast--bad' : ''); }, 3200);
  };
  RN.copy = async (text, btn) => {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
    }
    RN.toast(ok ? 'Copied' : 'Select the text and copy it manually', !ok);
    if (btn && ok) { const o = btn.innerHTML; btn.textContent = 'Copied'; setTimeout(() => { btn.innerHTML = o; }, 1500); }
  };

  /* time & hours (IST) */
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAYN = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  RN.DAYN = DAYN;
  RN.nowIST = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: RN.C.contact.hours.timezone || 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = (t) => (parts.find(p => p.type === t) || {}).value;
      return { day: g('weekday').toLowerCase().slice(0, 3), min: parseInt(g('hour'), 10) % 24 * 60 + parseInt(g('minute'), 10) };
    } catch (e) { const d = new Date(); return { day: DAYS[d.getDay()], min: d.getHours() * 60 + d.getMinutes() }; }
  };
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  RN.openState = () => {
    const H = RN.C.contact.hours; if (!H || !H.days) return null;
    const now = RN.nowIST(); const today = H.days[now.day];
    if (today) { const [a, b] = today.split('-'); if (now.min >= toMin(a) && now.min < toMin(b)) return { open: true, text: 'Open now · until ' + b + ' IST' }; if (now.min < toMin(a)) return { open: false, text: 'Closed · opens today ' + a + ' IST' }; }
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let i = order.indexOf(now.day);
    for (let k = 1; k <= 7; k++) { const d = order[(i + k) % 7]; if (H.days[d]) return { open: false, text: 'Closed · opens ' + DAYN[d].slice(0, 3) + ' ' + H.days[d].split('-')[0] + ' IST' }; }
    return null;
  };
  RN.hoursRows = () => {
    const H = RN.C.contact.hours, now = RN.nowIST();
    return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => `<dt class="${d === now.day ? 'today' : ''}">${DAYN[d].slice(0, 3)}</dt><dd class="${d === now.day ? 'today' : ''}">${H.days[d] ? esc(H.days[d].replace('-', ' – ')) : 'Closed'}</dd>`).join('');
  };
  RN.telHref = (v) => 'tel:' + String(v || '').replace(/[^\d+]/g, '');
  RN.waHref = (msg) => { const n = String(RN.C.contact.whatsapp.value || '').replace(/\D/g, ''); return n ? 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : '') : ''; };

  /* ---------- icons ---------- */
  const P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUR: '<path d="M7 17L17 7M8 7h9v9"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    wa: '<path d="M4 20l1.4-4.1A8 8 0 1 1 8.2 18.6z"/><path d="M9.2 8.8c.3 2.9 2.9 5.6 6 6l1-1.4-1.9-1-1 .7a4 4 0 0 1-2.4-2.4l.7-1-1-1.9z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19a4 4 0 0 1-4 3h-2"/>',
    switch: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 12h1M9 12h1M12 12h1M15 12h1M18.5 11v2"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r=".8"/>',
    fibre: '<path d="M3 17c4 0 4-10 9-10s5 10 9 10"/><circle cx="3" cy="17" r="1.5"/><circle cx="21" cy="17" r="1.5"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
    camera: '<rect x="3" y="8" width="13" height="9" rx="2"/><path d="M16 11l5-3v9l-5-3"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    building: '<path d="M4 21V5l8-2v18M12 7l8 3v11M8 8v.5M8 12v.5M8 16v.5M16 13v.5M16 17v.5M2 21h20"/>',
    send: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    quote: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h5"/>'
  };
  RN.icon = (n, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${P[n] || P.spark}</svg>`;

  RN.mark = (size) => `<svg class="brand__mark" viewBox="0 0 32 32" width="${size || 30}" height="${size || 30}" aria-hidden="true">
    <defs><radialGradient id="rnCore" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#4cc9ff"/><stop offset="1" stop-color="#4cc9ff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="16" cy="16" r="14" fill="none" stroke="#c9d3df" stroke-opacity=".9" stroke-width="1.4"/>
    <circle cx="16" cy="16" r="8.5" fill="#0d131c" stroke="#c9d3df" stroke-opacity=".45" stroke-width="1"/>
    <circle cx="16" cy="16" r="6" fill="url(#rnCore)"/><circle cx="16" cy="16" r="1.8" fill="#fff"/>
    <path d="M16 2v3.5M16 26.5V30" stroke="#4cc9ff" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  RN.brand = () => `<span class="brand__word"><span class="brand__name">R<b>.</b> N<b>.</b> Electronics</span><span class="brand__sub">${esc(RN.C.company.descriptor)}</span></span>`;

  /* ---------- device illustrations (representative drawings) ---------- */
  function defs(u) {
    return `<defs>
<linearGradient id="mt${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3e9f0"/><stop offset=".55" stop-color="#9aa6b4"/><stop offset="1" stop-color="#6f7a88"/></linearGradient>
<linearGradient id="mf${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46505e"/><stop offset=".45" stop-color="#262d37"/><stop offset="1" stop-color="#151a21"/></linearGradient>
<linearGradient id="ms${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c222b"/><stop offset="1" stop-color="#0c1015"/></linearGradient>
<linearGradient id="wt${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cdd5de"/></linearGradient>
<linearGradient id="wf${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ebf1"/><stop offset="1" stop-color="#a9b3bf"/></linearGradient>
<linearGradient id="ws${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8c1cc"/><stop offset="1" stop-color="#7e8896"/></linearGradient>
<linearGradient id="dk${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b323c"/><stop offset="1" stop-color="#0b0e12"/></linearGradient>
<radialGradient id="gl${u}"><stop offset="0" stop-color="#4cc9ff" stop-opacity=".9"/><stop offset="1" stop-color="#4cc9ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sh${u}"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="bl${u}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
  }
  function obox(x, y, w, h, d, top, front, side, extra) {
    const dx = d * 0.62, dy = d * 0.34;
    return `<polygon points="${x},${y} ${x + w},${y} ${x + w + dx},${y - dy} ${x + dx},${y - dy}" fill="${top}"/>` +
      `<polygon points="${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y + h - dy} ${x + w},${y + h}" fill="${side}"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${front}" ${extra || ''}/>` +
      `<path d="M${x} ${y}H${x + w}L${x + w + dx} ${y - dy}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>`;
  }
  const shadow = (u, cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh${u})"/>`;
  const led = (u, x, y, c, r) => `<circle cx="${x}" cy="${y}" r="${(r || 1.6) * 3}" fill="${c}" opacity=".25" filter="url(#bl${u})"/><circle cx="${x}" cy="${y}" r="${r || 1.6}" fill="${c}"/>`;
  const rj45 = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#05070a" stroke="#6b7684" stroke-width=".6"/><rect x="${x + w * .25}" y="${y + h - 2.6}" width="${w * .5}" height="2" fill="#2a313b"/>`;
  const sfp = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="#9aa5b2"/><rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" fill="#07090c"/>`;

  const ARTS = {
    switch(u) {
      const x = 46, y = 150, w = 270, h = 44, d = 110;
      let s = shadow(u, 210, 205, 190, 20) + obox(x, y, w, h, d, `url(#mt${u})`, `url(#mf${u})`, `url(#ms${u})`);
      for (let i = 0; i < 9; i++) s += `<path d="M${x + 30 + i * 22} ${y - 10}l${30} -16" stroke="#000" stroke-opacity=".18" stroke-width="2"/>`;
      s += `<rect x="${x - 10}" y="${y}" width="10" height="${h}" fill="#59636f"/><circle cx="${x - 5}" cy="${y + 10}" r="2" fill="#11161c"/><circle cx="${x - 5}" cy="${y + h - 10}" r="2" fill="#11161c"/>`;
      for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { const px = x + 12 + i * 14 + Math.floor(i / 6) * 6, py = y + 8 + r * 15; s += rj45(px, py, 11, 10); }
      for (let i = 0; i < 4; i++) s += sfp(x + 206 + i * 14, y + 13, 12, 9);
      for (let i = 0; i < 12; i++) s += led(u, x + 17.5 + i * 14 + Math.floor(i / 6) * 6, y + 39.5, i % 5 === 3 ? '#ffb648' : '#3fe0a0', 1.1);
      s += led(u, x + 258, y + 12, '#3fe0a0', 1.5) + led(u, x + 258, y + 20, '#4cc9ff', 1.5);
      return s;
    },
    rackrouter(u) {
      const x = 46, y = 150, w = 270, h = 44, d = 110;
      let s = shadow(u, 210, 205, 190, 20) + obox(x, y, w, h, d, `url(#mt${u})`, `url(#mf${u})`, `url(#ms${u})`);
      s += `<rect x="${x - 10}" y="${y}" width="10" height="${h}" fill="#59636f"/>`;
      s += `<rect x="${x + 14}" y="${y + 11}" width="58" height="20" rx="2" fill="#06121c" stroke="#4cc9ff" stroke-opacity=".5"/><path d="M${x + 20} ${y + 21}h18M${x + 20} ${y + 26}h30" stroke="#4cc9ff" stroke-width="1.4" opacity=".8"/>`;
      for (let i = 0; i < 5; i++) s += rj45(x + 96 + i * 18, y + 15, 14, 12);
      for (let i = 0; i < 2; i++) s += sfp(x + 196 + i * 18, y + 17, 14, 9);
      for (let i = 0; i < 5; i++) s += led(u, x + 103 + i * 18, y + 34, '#3fe0a0', 1.1);
      s += led(u, x + 252, y + 16, '#3fe0a0', 1.6) + led(u, x + 252, y + 26, '#ffb648', 1.6);
      return s;
    },
    router(u) {
      const x = 74, y = 182, w = 218, h = 22, d = 150, dx = d * .62, dy = d * .34;
      let s = shadow(u, 216, 214, 175, 22);
      const ants = [0.12, 0.38, 0.62, 0.88].map((t, i) => { const ax = x + dx + w * t, ay = y - dy; const rot = (i - 1.5) * 9; return `<g transform="rotate(${rot} ${ax} ${ay})"><rect x="${ax - 5}" y="${ay - 112}" width="10" height="114" rx="5" fill="url(#dk${u})" stroke="#4a5462" stroke-width=".8"/><rect x="${ax - 2}" y="${ay - 108}" width="2" height="96" rx="1" fill="#fff" opacity=".12"/></g>`; });
      s += ants.join('');
      s += obox(x, y, w, h, d, `url(#dk${u})`, `url(#mf${u})`, `url(#ms${u})`);
      for (let i = 0; i < 7; i++) s += `<path d="M${x + 22 + i * 26} ${y - 8}l${dx * .6} ${-dy * .6}" stroke="#4cc9ff" stroke-opacity=".08" stroke-width="10"/>`;
      s += `<path d="M${x + 70} ${y - dy / 2}l60 0" stroke="#4cc9ff" stroke-opacity=".25"/>`;
      for (let i = 0; i < 6; i++) s += led(u, x + 30 + i * 26, y + 11, i === 0 ? '#3fe0a0' : '#4cc9ff', 1.3);
      return s;
    },
    ap(u) {
      let s = shadow(u, 200, 222, 160, 18);
      s += `<ellipse cx="200" cy="184" rx="140" ry="50" fill="#8e99a7"/><rect x="60" y="164" width="280" height="20" fill="url(#ws${u})"/><ellipse cx="200" cy="164" rx="140" ry="50" fill="url(#wt${u})"/>`;
      s += `<ellipse cx="200" cy="164" rx="122" ry="42" fill="none" stroke="#fff" stroke-opacity=".7"/><ellipse cx="200" cy="160" rx="16" ry="6" fill="url(#gl${u})"/><ellipse cx="200" cy="160" rx="9" ry="3.4" fill="none" stroke="#4cc9ff" stroke-width="1.6"/>`;
      for (let i = 1; i <= 3; i++) s += `<path d="M${200 - 40 * i} ${110 - i * 6} Q200 ${70 - i * 26} ${200 + 40 * i} ${110 - i * 6}" fill="none" stroke="#4cc9ff" stroke-opacity="${0.5 - i * 0.12}" stroke-width="1.6" stroke-linecap="round"/>`;
      return s;
    },
    extender(u) {
      let s = shadow(u, 205, 252, 90, 12);
      s += `<polygon points="270,74 296,60 296,206 270,222" fill="url(#ws${u})"/><rect x="146" y="74" width="124" height="148" rx="14" fill="url(#wf${u})"/><path d="M146 88a14 14 0 0 1 14-14h96a14 14 0 0 1 14 14" fill="none" stroke="#fff" stroke-opacity=".8"/>`;
      s += `<rect x="128" y="98" width="10" height="108" rx="5" fill="url(#dk${u})"/><rect x="278" y="98" width="10" height="108" rx="5" fill="url(#dk${u})"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${196 + i * 8}" y="${160 - i * 8}" width="5" height="${10 + i * 8}" rx="1.5" fill="${i < 3 ? '#4cc9ff' : '#9aa5b2'}" opacity="${i < 3 ? 1 : .5}"/>`;
      s += led(u, 208, 120, '#3fe0a0', 2.2);
      return s;
    },
    media(u) {
      let s = shadow(u, 200, 214, 180, 20);
      s += obox(60, 176, 160, 40, 100, `url(#mt${u})`, `url(#mf${u})`, `url(#ms${u})`);
      s += rj45(78, 190, 18, 16) + sfp(110, 192, 22, 12);
      s += led(u, 150, 196, '#3fe0a0', 1.4) + led(u, 162, 196, '#3fe0a0', 1.4) + led(u, 174, 196, '#4cc9ff', 1.4) + led(u, 186, 196, '#ffb648', 1.4);
      /* SFP module + LC duplex + aqua fibre */
      s += `<g transform="translate(232 196) rotate(-12)"><polygon points="0,0 96,0 112,-10 16,-10" fill="url(#mt${u})"/><rect x="0" y="0" width="96" height="12" fill="url(#mf${u})"/><polygon points="96,0 112,-10 112,2 96,12" fill="url(#ms${u})"/><rect x="-14" y="-3" width="16" height="16" rx="2" fill="#2f6fd6"/><rect x="-14" y="13" width="16" height="0" /><rect x="6" y="3" width="20" height="5" fill="#cfd6de" opacity=".6"/></g>`;
      s += `<path d="M220 200 C 190 236, 140 250, 70 256" fill="none" stroke="#2ec4d8" stroke-width="5" stroke-linecap="round"/><path d="M220 200 C 190 236, 140 250, 70 256" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round" transform="translate(0 -1.4)"/>`;
      return s;
    },
    onu(u) {
      let s = shadow(u, 200, 212, 170, 20);
      s += obox(70, 172, 200, 38, 120, `url(#wt${u})`, `url(#wf${u})`, `url(#ws${u})`);
      ['PWR', 'PON', 'LOS', 'LAN'].forEach((t, i) => { s += led(u, 92 + i * 30, 186, i === 2 ? '#ff7a7a' : '#3fe0a0', 1.6); s += `<text x="${92 + i * 30}" y="200" font-family="monospace" font-size="6.5" fill="#56606c" text-anchor="middle">${t}</text>`; });
      s += `<rect x="296" y="142" width="18" height="14" rx="2" fill="#17b26a"/><rect x="314" y="145" width="22" height="8" fill="#c9d3df"/>`;
      s += `<path d="M336 149 C 370 150, 378 196, 348 236" fill="none" stroke="#1d232b" stroke-width="7" stroke-linecap="round"/><path d="M336 148 C 368 149, 376 194, 347 233" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.5"/>`;
      return s;
    },
    catv(u) {
      let s = shadow(u, 200, 226, 150, 18);
      s += obox(110, 160, 160, 62, 70, `url(#mt${u})`, `url(#wf${u})`, `url(#ws${u})`);
      for (let i = 0; i < 7; i++) s += `<path d="M${124 + i * 20} ${150}l30 -16" stroke="#6f7a88" stroke-width="3" stroke-opacity=".5"/>`;
      const f = (x, y) => `<polygon points="${x - 9},${y} ${x - 4.5},${y - 8} ${x + 4.5},${y - 8} ${x + 9},${y} ${x + 4.5},${y + 8} ${x - 4.5},${y + 8}" fill="#c9a94e"/><circle cx="${x}" cy="${y}" r="5" fill="#8a6f2a"/><circle cx="${x}" cy="${y}" r="1.4" fill="#e7d9a6"/>`;
      s += f(132, 182) + `<text x="132" y="208" font-family="monospace" font-size="7" fill="#56606c" text-anchor="middle">IN</text>`;
      for (let i = 0; i < 4; i++) s += f(170 + i * 26, 182);
      s += `<text x="209" y="208" font-family="monospace" font-size="7" fill="#56606c" text-anchor="middle">OUT</text>`;
      s += `<path d="M132 190 C 120 230, 80 236, 40 230" fill="none" stroke="#11161c" stroke-width="7" stroke-linecap="round"/><path d="M132 190 C 120 230, 80 236, 40 230" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="1.5"/>`;
      return s;
    },
    camera(u) {
      let s = shadow(u, 200, 252, 100, 14);
      s += `<ellipse cx="200" cy="240" rx="64" ry="16" fill="#9aa5b2"/><rect x="136" y="210" width="128" height="30" fill="url(#ws${u})"/><ellipse cx="200" cy="210" rx="64" ry="16" fill="url(#wt${u})"/>`;
      s += `<circle cx="200" cy="132" r="76" fill="url(#wt${u})"/><circle cx="200" cy="132" r="76" fill="none" stroke="#fff" stroke-opacity=".6"/>`;
      s += `<path d="M126 140 Q200 176 274 140" fill="none" stroke="#9aa5b2" stroke-width="1.5"/>`;
      s += `<ellipse cx="190" cy="128" rx="40" ry="36" fill="#0b0e12"/><circle cx="190" cy="128" r="22" fill="#111a24" stroke="#2a3a52" stroke-width="3"/><circle cx="190" cy="128" r="11" fill="#04070b"/><circle cx="183" cy="121" r="4" fill="#4cc9ff" opacity=".7"/><circle cx="197" cy="134" r="2" fill="#fff" opacity=".4"/>`;
      s += led(u, 232, 104, '#3fe0a0', 1.6);
      return s;
    },
    accessory(u) {
      let s = shadow(u, 200, 240, 170, 14);
      for (let i = 0; i < 5; i++) s += `<ellipse cx="${240}" cy="${200 - i * 6}" rx="${86 - i * 3}" ry="${30 - i}" fill="none" stroke="#2f6fd6" stroke-width="6" opacity="${0.55 + i * 0.09}"/>`;
      s += `<path d="M160 196 C 120 196, 108 150, 120 122" fill="none" stroke="#2f6fd6" stroke-width="6" stroke-linecap="round"/>`;
      const plug = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-14" y="0" width="28" height="22" rx="3" fill="#2f6fd6"/><path d="M-12 -30 h24 l2 30 h-28z" fill="#dfe8f2" fill-opacity=".22" stroke="#e9eff6" stroke-opacity=".6"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(k => `<rect x="${-9.5 + k * 2.6}" y="-28" width="1.4" height="7" fill="#d4af37"/>`).join('')}<rect x="-4" y="-38" width="8" height="10" fill="#e9eff6" fill-opacity=".35"/></g>`;
      s += plug(120, 122, -8) + plug(86, 168, -28);
      s += `<path d="M86 168 C 70 200, 110 214, 150 204" fill="none" stroke="#2f6fd6" stroke-width="6" stroke-linecap="round"/>`;
      return s;
    }
  };
  RN.art = (kind, title) => {
    const u = RN.uid(); const f = ARTS[kind] || ARTS.switch;
    return `<svg viewBox="0 0 400 290" role="img" aria-label="${esc(title || 'Equipment illustration')}">${defs(u)}${f(u)}</svg>`;
  };

  /* industry line art */
  const IND = {
    hotel: '<path d="M30 104V34l30-10 30 10v70"/><path d="M42 46h8M70 46h8M42 60h8M70 60h8M42 74h8M70 74h8M42 88h8M70 88h8"/><path d="M54 104V92h12v12"/><path d="M18 104h84"/><path d="M44 18a22 22 0 0 1 32 0M50 11a13 13 0 0 1 20 0" />',
    rack: '<rect x="36" y="16" width="48" height="88" rx="3"/><path d="M42 28h36M42 40h36M42 52h36M42 64h36M42 76h36M42 88h36"/><path d="M47 34h2M53 34h2M47 46h2M53 46h2M47 58h2"/><path d="M84 40c14 0 14 20 26 20M84 70c14 0 14-10 26-10M10 60c10 0 14-20 26-20"/>',
    tower: '<path d="M60 14L40 106M60 14l20 92M44 86h32M48 66h24M52 46h16M44 86l28-20M76 86L48 66M48 66l20-20M72 66L52 46"/><path d="M36 22a28 28 0 0 1 0 28M84 22a28 28 0 0 0 0 28M28 16a40 40 0 0 1 0 40M92 16a40 40 0 0 0 0 40"/><path d="M8 106h104"/>',
    office: '<path d="M12 84h44M64 84h44M18 84v20M50 84v20M70 84v20M102 84v20"/><rect x="20" y="58" width="28" height="20" rx="2"/><rect x="72" y="58" width="28" height="20" rx="2"/><path d="M34 78v6M86 78v6"/><path d="M48 22h24v14H48zM60 36v10M34 46h52M34 46v12M86 46v12"/>',
    gaming: '<rect x="10" y="40" width="30" height="22" rx="2"/><rect x="45" y="36" width="30" height="26" rx="2"/><rect x="80" y="40" width="30" height="22" rx="2"/><path d="M25 62v8M60 62v8M95 62v8M10 74h100"/><path d="M40 92h40l6 10H34z"/><path d="M14 18h20M22 26h30M72 18h34M84 26h22"/>',
    home: '<path d="M18 58L60 24l42 34"/><path d="M28 50v52h64V50"/><path d="M52 102V78h16v24"/><path d="M48 62a16 16 0 0 1 24 0M53 68a8 8 0 0 1 14 0"/><circle cx="84" cy="62" r="5"/><path d="M84 67v6"/>'
  };
  RN.indArt = (k) => `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IND[k] || IND.office}</svg>`;

  /* ---------- runtime capabilities (claude.ai artifact) ---------- */
  RN.cap = { db: null, user: null, downloads: null, uid: null, canEdit: false, ready: false };
  RN.capReady = (async () => {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') { RN.cap.ready = true; return RN.cap; }
    try {
      const [db, user, dl] = await Promise.all([c.use('db').catch(() => null), c.use('user').catch(() => null), c.use('downloads').catch(() => null)]);
      RN.cap.db = db; RN.cap.user = user; RN.cap.downloads = dl;
      if (user) { try { RN.cap.uid = await user.id(); } catch (e) { } try { RN.cap.canEdit = !!(await user.canEdit()); } catch (e) { } }
    } catch (e) { }
    RN.cap.ready = true; return RN.cap;
  })();
  RN.inArtifact = () => !!(window.claude && typeof window.claude.use === 'function');

  /* media (uploaded product photos stored in db) */
  RN.media = {};
  RN.resolveMedia = async (root) => {
    const imgs = $$('img[data-media]', root); if (!imgs.length) return;
    await RN.capReady;
    for (const im of imgs) {
      const id = im.getAttribute('data-media');
      if (RN.media[id]) { im.src = RN.media[id]; continue; }
      if (!RN.cap.db) continue;
      try { const snap = await RN.cap.db.doc('media/' + id).get(); if (snap.exists) { RN.media[id] = snap.data().data; im.src = RN.media[id]; } } catch (e) { }
    }
  };
  RN.imgTag = (src, alt) => src.startsWith('media:') ? `<img data-media="${esc(src.slice(6))}" alt="${esc(alt)}" loading="lazy" decoding="async">` : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  RN.productVisual = (p) => p.images && p.images.length ? RN.imgTag(p.images[0], p.name) : RN.art(p.art, p.name + ' (illustration)');

  /* save a file (downloads capability in artifact, Blob link elsewhere) */
  RN.saveFile = async (filename, data, mime) => {
    await RN.capReady;
    if (RN.cap.downloads) {
      try { await RN.cap.downloads.save({ filename, data }); return true; } catch (e) { if (e && e.code === 'declined') return false; RN.toast('Download is not available here: ' + (e && e.message || 'unknown error'), true); return false; }
    }
    if (RN.inArtifact()) { RN.toast('Downloads are not available in this view', true); return false; }
    const blob = new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return true;
  };
})();

/* R. N. Electronics — UI runtime: router, chrome, motion, canvases, 3D mounts */
(function () {
  'use strict';
  const RN = window.RN; const { $, $$, esc } = RN;

  /* ======================= router ======================= */
  const NAV = [['home', 'Home'], ['about', 'About'], ['products', 'Products'], ['solutions', 'Solutions'], ['industries', 'Industries'], ['applications', 'Applications'], ['contact', 'Contact']];
  RN.NAV = NAV;
  RN.href = (name, arg) => {
    if (RN.router === 'path') {
      if (name === 'home') return RN.base;
      if (name === 'product') return RN.base + 'products/' + arg + '/';
      if (name === 'products' && arg) return RN.base + 'products/?c=' + encodeURIComponent(arg);
      if (name === 'quote' && arg) return RN.base + 'quote/?p=' + encodeURIComponent(arg);
      return RN.base + name + '/';
    }
    return '#' + name + (arg ? '.' + arg : '');
  };
  RN.parse = () => {
    if (RN.router === 'path') {
      let p = location.pathname; if (p.indexOf(RN.base) === 0) p = p.slice(RN.base.length);
      const seg = p.split('/').filter(Boolean); const q = new URLSearchParams(location.search);
      if (!seg.length) return { name: 'home' };
      if (seg[0] === 'products' && seg[1]) return { name: 'product', arg: seg[1] };
      if (seg[0] === 'products') return { name: 'products', arg: q.get('c') || '' };
      if (seg[0] === 'quote') return { name: 'quote', arg: q.get('p') || '' };
      return { name: seg[0] };
    }
    const h = decodeURIComponent((location.hash || '').slice(1));
    if (!h || h === 'home' || h === 'top') return { name: 'home' };
    const i = h.indexOf('.');
    return i < 0 ? { name: h } : { name: h.slice(0, i), arg: h.slice(i + 1) };
  };

  let busy = false, outPlayed = false;
  RN.go = (url) => {
    if (busy) return;
    const same = (RN.router === 'path') ? (url === location.pathname + location.search) : (url === location.hash || (url === '#home' && !location.hash));
    if (same) { RN.scrollTo(0); return; }
    busy = true;
    RN.closeMenu && RN.closeMenu();
    RN.txOut().then(() => {
      outPlayed = true;
      if (RN.router === 'path') { history.pushState(null, '', url); RN.render(); }
      else { if (location.hash === url) RN.render(); else location.hash = url; }
      busy = false;
    });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    if (a.hasAttribute('data-scroll')) { e.preventDefault(); const t = $(a.getAttribute('data-scroll')); if (t) RN.scrollTo(t.getBoundingClientRect().top + scrollY - 70); return; }
    const href = a.getAttribute('href'); if (!href || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (RN.router === 'hash' && href[0] === '#' && a.hasAttribute('data-link')) { e.preventDefault(); RN.go(href); }
    else if (RN.router === 'path' && a.hasAttribute('data-link')) { e.preventDefault(); RN.go(href); }
  });
  if (RN.router === 'hash') window.addEventListener('hashchange', () => { RN.render(); });
  else window.addEventListener('popstate', () => RN.render());

  /* ======================= page transition ======================= */
  RN.txOut = () => new Promise(res => {
    const tx = $('#tx'); if (!tx || RN.reduced) return res();
    tx.className = 'tx is-on'; setTimeout(res, 560);
  });
  RN.txIn = () => {
    const tx = $('#tx'); if (!tx) return;
    if (!outPlayed) { tx.className = 'tx'; return; }
    outPlayed = false; tx.className = 'tx is-out';
    setTimeout(() => { if (tx.className === 'tx is-out') tx.className = 'tx'; }, 520);
  };

  /* ======================= chrome ======================= */
  RN.renderChrome = () => {
    const C = RN.C;
    const pb = $('#previewbar');
    if (pb) { pb.hidden = RN.isLive(); document.body.classList.toggle('has-preview', !RN.isLive()); pb.innerHTML = `<span class="long">Preview build. Items marked <span class="flag">Unverified</span> come from public listings and reviews and need confirmation by R. N. Electronics before launch.</span><span class="short">Preview: <span class="flag">Unverified</span> items need owner confirmation.</span><a href="${RN.href('admin')}" data-link>Open content admin</a>`; }
    const setPb = () => { const h = (pb && !pb.hidden) ? pb.offsetHeight : 0; document.documentElement.style.setProperty('--pb', h + 'px'); };
    setPb(); if (!RN._pbr) { RN._pbr = 1; window.addEventListener('resize', setPb); }
    $('#nav').innerHTML = `
      <a class="brand" href="${RN.href('home')}" data-link aria-label="R. N. Electronics home">${RN.mark()}${RN.brand()}</a>
      <nav class="nav__links" aria-label="Primary">${NAV.map(([k, l]) => `<a href="${RN.href(k)}" data-link data-nav="${k}">${l}</a>`).join('')}<span class="nav__ind" aria-hidden="true"></span></nav>
      <a class="btn btn--primary btn--sm nav__cta" href="${RN.href('quote')}" data-link data-magnetic><span class="btn__in">Get in Touch ${RN.icon('arrow')}</span></a>
      <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mmenu"><span></span><span></span></button>`;
    const ph = RN.show(C.contact.phone) ? C.contact.phone.value : '';
    $('#mmenu').innerHTML = `<nav aria-label="Mobile">${NAV.concat([['support', 'Support'], ['quote', 'Request a Quote']]).map(([k, l], i) => `<a href="${RN.href(k)}" data-link data-nav="${k}" style="transition-delay:${0.12 + i * 0.04}s"><small>${String(i + 1).padStart(2, '0')}</small>${l}</a>`).join('')}</nav>
      <div class="mmenu__foot">${RN.show(C.contact.address) ? `<div>${esc(C.contact.address.lines.join(', '))}</div>` : ''}${ph ? `<div class="mono">${esc(ph)}</div>` : ''}<a class="btn btn--primary" href="${RN.href('quote')}" data-link><span class="btn__in">Request a Quote ${RN.icon('arrow')}</span></a></div>`;
    $('#burger').addEventListener('click', () => { const open = !$('#mmenu').classList.contains('is-open'); RN.toggleMenu(open); });
    $('#footer').innerHTML = RN.footerHTML();
    RN.markNav();
  };
  RN.toggleMenu = (open) => {
    const m = $('#mmenu'), b = $('#burger'); if (!m) return;
    m.classList.toggle('is-open', open); b && b.setAttribute('aria-expanded', open ? 'true' : 'false'); b && b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('lock', open); m.setAttribute('aria-hidden', open ? 'false' : 'true');
  };
  RN.closeMenu = () => RN.toggleMenu(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { RN.closeMenu(); RN.closeAssistant && RN.closeAssistant(); } });

  RN.markNav = () => {
    const r = RN.parse(); const key = r.name === 'product' ? 'products' : r.name;
    $$('[data-nav]').forEach(a => { if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    requestAnimationFrame(RN.moveInd);
  };
  RN.moveInd = () => {
    const ind = $('.nav__ind'), links = $('.nav__links'); if (!ind || !links) return;
    const a = $('.nav__links a[aria-current="page"]');
    if (!a) { ind.style.opacity = 0; return; }
    const lr = links.getBoundingClientRect(), r = a.getBoundingClientRect();
    ind.style.opacity = 1; ind.style.width = (r.width - 26) + 'px'; ind.style.transform = `translateX(${r.left - lr.left + 13}px)`;
  };
  window.addEventListener('resize', () => RN.moveInd());

  RN.footerHTML = () => {
    const C = RN.C, ct = C.contact, cats = RN.vis(C.categories);
    const ph = RN.show(ct.phone) ? ct.phone.value : '', em = RN.show(ct.email) ? ct.email.value : '';
    const social = (ct.social || []).filter(RN.show);
    return `<canvas class="footer__net" data-net="footer" aria-hidden="true"></canvas>
    <div class="wrap">
      <div class="footer__top">
        <div class="footer__lead">
          <a class="brand" href="${RN.href('home')}" data-link>${RN.mark(36)}${RN.brand()}</a>
          <p>${esc(C.company.descriptor)}. ${RN.show(ct.address) ? esc(ct.address.lines.slice(0, 3).join(', ')) + '.' : ''}</p>
          ${ph || em ? `<p class="mono">${ph ? esc(ph) : ''}${ph && em ? '<br>' : ''}${em ? esc(em) : ''}</p>` : ''}
          ${social.length ? `<p>${social.map(s => `<a class="link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(' · ')}</p>` : ''}
        </div>
        <div><h4>Quick links</h4><ul>${[['home', 'Home'], ['about', 'About'], ['solutions', 'Solutions'], ['industries', 'Industries'], ['applications', 'Applications'], ['support', 'Service & Support'], ['contact', 'Contact']].map(([k, l]) => `<li><a href="${RN.href(k)}" data-link>${l}</a></li>`).join('')}</ul></div>
        <div><h4>Products</h4><ul>${cats.length ? cats.map(c => `<li><a href="${RN.href('products', c.id)}" data-link>${esc(c.name)}</a></li>`).join('') : `<li><a href="${RN.href('products')}" data-link>Catalogue</a></li>`}</ul></div>
        <div><h4>Enquiries</h4><ul><li><a href="${RN.href('quote')}" data-link>Request a Quote</a></li><li><a href="${RN.href('contact')}" data-link>Contact Us</a></li><li><a href="${RN.href('support')}" data-link>FAQs</a></li></ul>
          <h4 style="margin-top:1.6rem">Legal</h4><ul><li><a href="${RN.href('privacy')}" data-link>Privacy Policy</a></li><li><a href="${RN.href('terms')}" data-link>Terms &amp; Conditions</a></li><li><a href="${RN.href('disclaimer')}" data-link>Disclaimer</a></li></ul></div>
      </div>
      <div class="footer__word" aria-hidden="true"><span>R. N. Electronics</span></div>
      <div class="footer__bot"><span>© ${new Date().getFullYear()} ${esc(C.company.name)}. ${esc(C.company.descriptor)}, Kolkata.</span><nav><a href="${RN.href('privacy')}" data-link>Privacy</a><a href="${RN.href('terms')}" data-link>Terms</a><a href="${RN.href('disclaimer')}" data-link>Disclaimer</a><a href="${RN.href('admin')}" data-link>Admin</a></nav></div>
    </div>`;
  };

  /* ======================= motion system ======================= */
  const loops = new Set();
  RN.onFrame = (fn) => { loops.add(fn); return () => loops.delete(fn); };
  let lastY = -1, vh = innerHeight;
  window.addEventListener('resize', () => { vh = innerHeight; }, { passive: true });
  function tick() {
    const y = scrollY;
    const nav = $('#nav'); if (nav) nav.classList.toggle('is-compact', y > 24);
    const prog = $('#progress'); if (prog) { const max = document.documentElement.scrollHeight - vh; prog.style.transform = `scaleX(${max > 0 ? RN.clamp(y / max, 0, 1) : 0})`; }
    loops.forEach(fn => { try { fn(y, vh, y !== lastY); } catch (e) { console.error(e); } });
    lastY = y;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* smooth wheel scrolling (desktop, fine pointer) */
  RN.smooth = { on: RN.fine && !RN.reduced && !RN.perf.lite, target: 0, cur: 0, active: false };
  RN.scrollTo = (y) => {
    const max = document.documentElement.scrollHeight - innerHeight; y = RN.clamp(y, 0, max);
    if (RN.reduced) { window.scrollTo(0, y); return; }
    if (RN.smooth.on) { RN.smooth.target = y; RN.smooth.cur = scrollY; RN.smooth.active = true; return; }
    window.scrollTo({ top: y, behavior: 'smooth' });
  };
  (function () {
    const S = RN.smooth; if (!S.on) return;
    const scrollable = (el) => { while (el && el !== document.body && el !== document.documentElement) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) return true; if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true; el = el.parentElement; } return false; };
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || document.body.classList.contains('lock') || scrollable(e.target)) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!S.active) { S.cur = scrollY; S.target = scrollY; }
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      S.target = RN.clamp(S.target + d, 0, document.documentElement.scrollHeight - innerHeight); S.active = true;
    }, { passive: false });
    RN.onFrame(() => {
      if (!S.active) return;
      if (Math.abs(scrollY - S.cur) > 2) { S.cur = scrollY; S.target = scrollY; S.active = false; return; } // user dragged scrollbar / keyboard
      S.cur += (S.target - S.cur) * 0.12;
      if (Math.abs(S.target - S.cur) < 0.5) { S.cur = S.target; S.active = false; }
      window.scrollTo(0, S.cur);
    });
  })();

  /* cursor light */
  if (RN.fine && !RN.reduced) {
    let cx = -999, cy = -999, tx = -999, ty = -999;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    RN.onFrame(() => { const el = $('#cursorlight'); if (!el) return; cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; el.style.transform = `translate3d(${cx}px,${cy}px,0)`; });
  }

  /* split words */
  function splitEl(el) {
    if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
          parts.forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; } const w = document.createElement('span'); w.className = 'w'; const s = document.createElement('span'); s.style.setProperty('--i', i++); s.textContent = p; w.appendChild(s); frag.appendChild(w); });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el); el.classList.add('split');
  }

  /* enhance a freshly-rendered subtree */
  let io;
  RN.enhance = (root) => {
    const motion = !RN.reduced && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('js-motion', motion);
    $$('[data-split]', root).forEach(splitEl);
    if (motion) {
      if (!io) io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
      $$('[data-reveal], .split, .seam', root).forEach(el => { el.classList.add('pre'); io.observe(el); });
      setTimeout(() => $$('.pre', root).forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.remove('pre'); el.classList.add('is-in'); } }), 2500);
    } else { $$('.seam', root).forEach(el => el.classList.add('is-in')); }
    if (RN.fine && !RN.reduced) {
      $$('[data-tilt]', root).forEach(tilt);
      $$('.btn--primary, .btn--glass, [data-magnetic]', root).forEach(magnetic);
      $$('[data-glow]', root).forEach(glow);
    }
    $$('[data-parallax]', root).forEach(el => { const k = parseFloat(el.getAttribute('data-parallax')) || 0.1; RN.track(RN.onFrame((y, h) => { const r = el.getBoundingClientRect(); const c = r.top + r.height / 2 - h / 2; el.style.transform = `translate3d(0,${(-c * k).toFixed(1)}px,0)`; })); });
    $$('[data-copy]', root).forEach(b => b.addEventListener('click', () => RN.copy(b.getAttribute('data-copy'), b)));
    $$('canvas[data-net]', root).forEach(c => RN.net(c, c.getAttribute('data-net')));
    RN.resolveMedia(root);
  };
  function tilt(el) {
    if (el._t) return; el._t = 1;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg'); el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%'); });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  }
  function glow(el) { el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--gx', (e.clientX - r.left) + 'px'); el.style.setProperty('--gy', (e.clientY - r.top) + 'px'); }); }
  function magnetic(el) {
    if (el._m) return; el._m = 1; const inner = el.querySelector('.btn__in');
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); el.style.transform = `translate3d(${(dx * .18).toFixed(1)}px,${(dy * .28).toFixed(1)}px,0)`; if (inner) inner.style.transform = `translate3d(${(dx * .08).toFixed(1)}px,${(dy * .1).toFixed(1)}px,0)`; el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; if (inner) inner.style.transform = ''; });
  }

  /* per-page cleanup registry */
  let cleanups = [];
  RN.track = (fn) => { cleanups.push(fn); return fn; };
  RN.cleanup = () => { cleanups.forEach(f => { try { f(); } catch (e) { } }); cleanups = []; };
  RN.whenVisible = (el, onIn, onOut, margin) => {
    if (!('IntersectionObserver' in window)) { onIn(); return; }
    const o = new IntersectionObserver((ents) => ents.forEach(en => en.isIntersecting ? onIn() : (onOut && onOut())), { rootMargin: margin || '120px' });
    o.observe(el); RN.track(() => o.disconnect());
  };

  /* ======================= 2D network canvas ======================= */
  RN.net = (canvas, kind) => {
    if (canvas._net) return; canvas._net = 1;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, nodes = [], run = false, raf = 0, t = 0;
    const density = kind === 'footer' ? 0.00007 : kind === 'head' ? 0.00006 : 0.00009;
    const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.round(RN.clamp(W * H * density * (RN.perf.lite ? .6 : 1), 14, 110)); nodes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, p: Math.random() })); };
    const pulses = [];
    const draw = () => {
      t += 1; ctx.clearRect(0, 0, W, H);
      const D = 150;
      for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1; }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < D * D) { const al = (1 - Math.sqrt(d2) / D) * .22; ctx.strokeStyle = `rgba(110,170,255,${al})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); if (pulses.length < 6 && Math.random() < .0006) pulses.push({ a, b, k: 0 }); }
      }
      for (const n of nodes) { ctx.fillStyle = 'rgba(160,200,255,.55)'; ctx.beginPath(); ctx.arc(n.x, n.y, 1.2, 0, 7); ctx.fill(); }
      for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; p.k += .012; if (p.k >= 1) { pulses.splice(i, 1); continue; } const x = p.a.x + (p.b.x - p.a.x) * p.k, y = p.a.y + (p.b.y - p.a.y) * p.k; const g = ctx.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, 'rgba(76,201,255,.9)'); g.addColorStop(1, 'rgba(76,201,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); }
      if (run) raf = requestAnimationFrame(draw);
    };
    const start = () => { if (run) return; run = true; if (!W) resize(); if (RN.reduced) { run = false; draw(); return; } raf = requestAnimationFrame(draw); };
    const stop = () => { run = false; cancelAnimationFrame(raf); };
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => { resize(); if (!run) draw(); }); ro.observe(canvas); if (kind !== 'footer') RN.track(() => ro.disconnect()); }
    const o = new IntersectionObserver((e) => e.forEach(en => en.isIntersecting ? start() : stop()), { rootMargin: '100px' });
    o.observe(canvas); if (kind !== 'footer') RN.track(() => { o.disconnect(); stop(); });
  };

  /* ======================= stylised map canvas ======================= */
  RN.mapCanvas = (canvas) => {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75); let W, H, run = false, raf = 0, t = 0;
    let CX = 0; const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); CX = canvas.hasAttribute('data-map') && W > 900 ? W * .7 : W / 2; };
    const S = 1; const N = 9;
    const streetsX = [], streetsZ = [];
    for (let i = -N; i <= N; i++) { streetsX.push(i * S + (i % 3 === 0 ? .18 : 0)); streetsZ.push(i * S * 0.8 + (i % 2 ? .12 : 0)); }
    const cars = Array.from({ length: 26 }, (_, i) => ({ ax: Math.random() < .5, line: Math.floor(Math.random() * (2 * N + 1)), k: Math.random(), v: (.0015 + Math.random() * .003) * (Math.random() < .5 ? 1 : -1) }));
    const TH = 0.98, DIST = 10.5, cs = Math.cos(TH), sn = Math.sin(TH);
    const proj = (x, z, yaw, w, h) => {
      const c = Math.cos(yaw), s = Math.sin(yaw); const rx = x * c - z * s, rz = x * s + z * c;
      const vy = -DIST * sn, vz = rz - DIST * cs; /* vector from camera to point (camera at (0, D sin, D cos)) */
      const yc = vy * cs - vz * sn, zc = -vy * sn - vz * cs;
      const f = Math.min(w, h) * 1.25;
      return { x: (CX || w / 2) + rx * f / Math.max(zc, .01), y: h * .46 - yc * f / Math.max(zc, .01), d: zc };
    };
    const line = (x1, z1, x2, z2, yaw, style, wd) => {
      const steps = 18; ctx.beginPath(); let pen = false;
      for (let i = 0; i <= steps; i++) { const k = i / steps; const p = proj(x1 + (x2 - x1) * k, z1 + (z2 - z1) * k, yaw, W, H); if (p.d < 1.2) { pen = false; continue; } if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y); }
      ctx.strokeStyle = style; ctx.lineWidth = wd || 1; ctx.stroke();
    };
    const draw = () => {
      t += 1 / 60; ctx.clearRect(0, 0, W, H);
      const yaw = -0.35 + Math.sin(t * .08) * .08; const L = N * S;
      streetsX.forEach((x, i) => line(x, -L, x, L, yaw, `rgba(120,165,230,${i === N ? 0 : .17})`, 1));
      streetsZ.forEach((z) => line(-L, z, L, z, yaw, 'rgba(120,165,230,.14)', 1));
      line(0, -L, 0, L, yaw, 'rgba(76,201,255,.55)', 2.2);
      line(-L, 1.6, L, 1.6, yaw, 'rgba(120,165,230,.25)', 1.6);
      cars.forEach(c => { c.k += c.v; if (c.k > 1) c.k = 0; if (c.k < 0) c.k = 1; const v = -L + c.k * 2 * L; const p = c.ax ? proj(streetsX[c.line], v, yaw, W, H) : proj(v, streetsZ[c.line], yaw, W, H); ctx.fillStyle = 'rgba(160,210,255,.6)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 7); ctx.fill(); });
      const pin = proj(0.04, 0.3, yaw, W, H);
      for (let k = 0; k < 3; k++) { const ph = ((t * .45 + k / 3) % 1); ctx.strokeStyle = `rgba(76,201,255,${(1 - ph) * .7})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(pin.x, pin.y, 10 + ph * 70, (10 + ph * 70) * .42, 0, 0, 7); ctx.stroke(); }
      const g = ctx.createLinearGradient(pin.x, pin.y - 90, pin.x, pin.y); g.addColorStop(0, 'rgba(76,201,255,0)'); g.addColorStop(1, 'rgba(76,201,255,.85)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pin.x, pin.y - 90); ctx.lineTo(pin.x, pin.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pin.x, pin.y, 4, 0, 7); ctx.fill();
      ctx.font = '500 10px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(233,239,246,.8)';
      const lab = proj(0, -4.2, yaw, W, H); ctx.save(); ctx.translate(lab.x + 8, lab.y); ctx.fillText('C.R. AVENUE', 0, 0); ctx.restore();
      ctx.fillStyle = 'rgba(233,239,246,.95)'; ctx.fillText('R. N. ELECTRONICS', pin.x + 12, pin.y - 70);
      ctx.fillStyle = 'rgba(166,178,195,.8)'; ctx.fillText('CHANDNI CHOWK · 700072', pin.x + 12, pin.y - 56);
      const m = proj(-0.15, -1.6, yaw, W, H); ctx.strokeStyle = 'rgba(255,182,72,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,182,72,.9)'; ctx.font = '600 8px "IBM Plex Mono", monospace'; ctx.fillText('M', m.x - 2.7, m.y + 3);
      if (run) raf = requestAnimationFrame(draw);
    };
    resize();
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => { resize(); if (!run) draw(); }); ro.observe(canvas); RN.track(() => ro.disconnect()); }
    RN.whenVisible(canvas, () => { if (run) return; run = !RN.reduced; draw(); }, () => { run = false; cancelAnimationFrame(raf); });
    RN.track(() => { run = false; cancelAnimationFrame(raf); });
  };

  /* ======================= hero 3D ======================= */
  RN.mountHero = (root) => {
    const stage = $('.hero__stage', root), canvas = $('canvas', stage); if (!stage || !canvas) return;
    if (!RN.perf.webgl || !window.RNScenes) return;
    let scene;
    try { scene = new RNScenes.HeroScene(canvas, { lite: RN.perf.lite }); } catch (e) { console.warn('3D unavailable', e); return; }
    const hero = $('.hero', root);
    const onPtr = (e) => scene.pointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    if (RN.fine) window.addEventListener('pointermove', onPtr, { passive: true });
    const onResize = () => { scene.layout(canvas.clientWidth, canvas.clientHeight); };
    window.addEventListener('resize', onResize); onResize();
    /* gentle auto-motion on touch devices */
    let tt = 0; const off = RN.onFrame((y) => { scene.setScroll(y / (hero.offsetHeight || innerHeight)); if (!RN.fine) { tt += 0.008; scene.pointer(Math.sin(tt) * .5, Math.cos(tt * .7) * .3); } });
    let frames = 0, acc = 0, degraded = false;
    scene.onFrame = (dt) => { if (!degraded && frames < 120) { frames++; acc += dt; if (frames === 120 && acc / 120 > 1 / 32) { scene.degrade(); degraded = true; } } };
    if (RN.reduced) { scene.frame(0.016); stage.classList.add('is-ready'); }
    else {
      RN.whenVisible(hero, () => scene.start(), () => scene.stop(), '0px');
      const vis = () => document.hidden ? scene.stop() : scene.start(); document.addEventListener('visibilitychange', vis);
      RN.track(() => document.removeEventListener('visibilitychange', vis));
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-ready')));
    }
    RN.track(() => { off(); window.removeEventListener('pointermove', onPtr); window.removeEventListener('resize', onResize); scene.dispose(); });
  };

  /* ======================= infrastructure 3D ======================= */
  RN.mountInfra = (root) => {
    const sec = $('.infra', root); if (!sec) return;
    const canvas = $('.infra__canvas', sec), panels = $$('.infra__panel', sec), bars = $$('.infra__bar i', sec), labels = $$('.infra__label', sec);
    if (!RN.perf.webgl || !window.RNScenes || RN.reduced) { sec.classList.add('infra--static'); canvas.classList.add('is-off'); return; }
    let scene = null; const anchorKeys = ['fibre', 'switching', 'wireless', 'endpoints'];
    const make = () => { if (scene) return; try { scene = new RNScenes.InfraScene(canvas, { lite: RN.perf.lite }); } catch (e) { sec.classList.add('infra--static'); canvas.classList.add('is-off'); return; } scene.onFrame = () => {
      labels.forEach((lb, i) => { const p = scene.screen(anchorKeys[i]); const on = scene.stageK && scene.stageK[i] > .9 && p && !p.behind; lb.classList.toggle('is-on', !!on); if (p) lb.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-140%)`; });
    }; };
    let active = -1;
    const off = RN.onFrame((y, h) => {
      const r = sec.getBoundingClientRect(); const total = sec.offsetHeight - h; const p = RN.clamp(-r.top / Math.max(1, total), 0, 1);
      if (scene) scene.setProgress(p);
      const st = p < .2 ? 0 : p < .44 ? 1 : p < .68 ? 2 : 3;
      if (st !== active) { active = st; panels.forEach((el, i) => el.classList.toggle('is-on', i === st)); }
      bars.forEach((b, i) => { const s = [0, .2, .44, .68][i], e = [.2, .44, .68, 1][i]; b.style.setProperty('--k', RN.clamp((p - s) / (e - s), 0, 1).toFixed(3)); });
    });
    RN.whenVisible(sec, () => { make(); scene && scene.start(); }, () => scene && scene.stop(), '200px');
    RN.track(() => { off(); scene && scene.dispose(); });
  };

  /* ======================= horizontal showcase ======================= */
  RN.mountHS = (root) => {
    const hs = $('.hs', root); if (!hs) return;
    const track = $('.hs__track', hs), panels = $$('.hs__panel', hs), counter = $('.hs__counter b', hs);
    const pinned = RN.fine && !RN.reduced && innerWidth >= 1024 && panels.length > 1;
    if (!pinned) {
      const upd = () => { const c = track.scrollLeft + track.clientWidth / 2; let best = 0, bd = 1e9; panels.forEach((p, i) => { const d = Math.abs(p.offsetLeft + p.offsetWidth / 2 - c); if (d < bd) { bd = d; best = i; } }); if (counter) counter.textContent = String(best + 1).padStart(2, '0'); };
      track.addEventListener('scroll', upd, { passive: true }); return;
    }
    hs.classList.add('is-pinned');
    const measure = () => { const dist = track.scrollWidth - innerWidth; hs.style.setProperty('--hs-h', (innerHeight + Math.max(0, dist)) + 'px'); return dist; };
    let dist = measure(); const onR = () => { dist = measure(); }; window.addEventListener('resize', onR);
    let cur = 0, idle = 0, lastSnap = -1;
    const off = RN.onFrame((y, h, moved) => {
      const r = hs.getBoundingClientRect(); const total = hs.offsetHeight - h; const p = RN.clamp(-r.top / Math.max(1, total), 0, 1);
      const target = -p * dist; cur += (target - cur) * 0.14; track.style.transform = `translate3d(${cur.toFixed(1)}px,0,0)`;
      let best = 0, bd = 1e9;
      panels.forEach((pn, i) => { const c = pn.offsetLeft + cur + pn.offsetWidth / 2 - innerWidth / 2; const k = RN.clamp(c / innerWidth, -1, 1); pn.style.setProperty('--tilt', (k * -10).toFixed(2) + 'deg'); pn.style.setProperty('--sc', (1 - Math.abs(k) * .06).toFixed(3)); const art = pn.querySelector('.hs__art svg, .hs__art img'); if (art) art.style.setProperty('--px', (k * -40).toFixed(1) + 'px'); if (Math.abs(c) < bd) { bd = Math.abs(c); best = i; } });
      if (counter) counter.textContent = String(best + 1).padStart(2, '0');
      /* soft snap after scrolling settles */
      if (moved) { idle = 0; lastSnap = -1; } else idle++;
      if (idle === 18 && p > 0.001 && p < 0.999 && lastSnap !== best && !RN.smooth.active) { lastSnap = best; const pn = panels[best]; const want = (pn.offsetLeft + pn.offsetWidth / 2 - innerWidth / 2) / Math.max(1, dist); const top = hs.offsetTop + RN.clamp(want, 0, 1) * total; if (Math.abs(top - scrollY) > 4) RN.scrollTo(top); }
    });
    RN.track(() => { off(); window.removeEventListener('resize', onR); });
  };

  /* ======================= solutions explorer ======================= */
  RN.mountSolx = (root) => {
    $$('.solx', root).forEach(sx => {
      const btns = $$('.solx__btn', sx), flow = $('.flow', sx);
      const run = () => { flow.classList.remove('is-run'); void flow.offsetWidth; flow.classList.add('is-run'); };
      btns.forEach(b => b.addEventListener('click', () => { btns.forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false')); flow.outerHTML = RN.flowHTML(RN.sol(b.dataset.sol)); const nf = $('.flow', sx); RN.enhance(nf); requestAnimationFrame(() => { nf.classList.add('is-run'); }); }));
      RN.whenVisible(flow, () => { if (!flow.classList.contains('is-run')) run(); }, null, '-15%');
    });
    $$('.flow[data-autorun]', root).forEach(f => RN.whenVisible(f, () => f.classList.add('is-run'), null, '-15%'));
  };

  /* ======================= industries stage ======================= */
  RN.mountInd = (root) => {
    $$('.ind', root).forEach(box => {
      const items = $$('.ind__item', box), stage = $('.ind__stage', box), panel = $('.ind__panel', box), art = $('.ind__art', box), bg = $('.ind__bg', box), canvas = $('.ind__canvas', box);
      const ctx = canvas.getContext('2d'); let W = 0, H = 0, links = [], k = 0, raf = 0, run = false;
      const hues = [['70%', '25%', 'rgba(46,107,255,.28)'], ['30%', '30%', 'rgba(76,201,255,.22)'], ['80%', '70%', 'rgba(80,120,255,.24)'], ['60%', '20%', 'rgba(63,224,160,.14)'], ['20%', '60%', 'rgba(120,90,255,.18)'], ['75%', '40%', 'rgba(76,201,255,.2)']];
      const resize = () => { const d = Math.min(devicePixelRatio || 1, 1.5); W = stage.clientWidth; H = stage.clientHeight; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
      const compute = () => { const sr = stage.getBoundingClientRect(), ar = art.getBoundingClientRect(); const ax = ar.left - sr.left + ar.width / 2, ay = ar.top - sr.top + ar.height * .55; links = $$('.ind__sols .pill', box).map(p => { const r = p.getBoundingClientRect(); return { ax, ay, bx: r.left - sr.left + r.width / 2, by: r.top - sr.top }; }); k = 0; };
      const draw = () => {
        ctx.clearRect(0, 0, W, H); k = Math.min(1, k + .025);
        links.forEach((l, i) => { const e = RN.clamp(k * 1.6 - i * .15, 0, 1); if (e <= 0) return; ctx.strokeStyle = 'rgba(76,201,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); const c1x = l.ax, c1y = l.ay + 80, c2x = l.bx, c2y = l.by - 80; const pts = 40, n = Math.floor(pts * e); for (let s = 0; s <= n; s++) { const t = s / pts, u = 1 - t; const x = u * u * u * l.ax + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * l.bx, y = u * u * u * l.ay + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * l.by; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
          const tt = ((performance.now() / 1600) + i * .3) % 1; if (e >= 1) { const u = 1 - tt; const x = u * u * u * l.ax + 3 * u * u * tt * c1x + 3 * u * tt * tt * c2x + tt * tt * tt * l.bx, y = u * u * u * l.ay + 3 * u * u * tt * c1y + 3 * u * tt * tt * c2y + tt * tt * tt * l.by; ctx.fillStyle = '#9fe4ff'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } });
        if (run) raf = requestAnimationFrame(draw);
      };
      let cur = -1;
      const set = (i, instant) => {
        if (i === cur) return; cur = i; const it = items[i]; const d = RN.ind(it.dataset.ind);
        items.forEach(x => x.classList.toggle('is-on', x === it));
        const hu = hues[i % hues.length]; bg.style.setProperty('--bx', hu[0]); bg.style.setProperty('--by', hu[1]); bg.style.setProperty('--bc', hu[2]);
        const swap = () => { panel.innerHTML = RN.indPanelHTML(d); art.innerHTML = RN.indArt(d.art); panel.classList.remove('out'); art.classList.remove('out'); requestAnimationFrame(() => { compute(); }); };
        if (instant) swap(); else { panel.classList.add('out'); art.classList.add('out'); setTimeout(swap, 260); }
      };
      items.forEach((it, i) => { it.addEventListener('mouseenter', () => RN.fine && set(i)); it.addEventListener('focus', () => set(i)); it.addEventListener('click', () => set(i)); });
      resize(); set(0, true);
      const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { resize(); compute(); }) : null; ro && ro.observe(stage); RN.track(() => ro && ro.disconnect());
      RN.whenVisible(stage, () => { if (run) return; run = true; compute(); draw(); }, () => { run = false; cancelAnimationFrame(raf); });
      RN.track(() => { run = false; cancelAnimationFrame(raf); });
    });
  };

  /* ======================= statement word lighting ======================= */
  RN.mountStatement = (root) => {
    const st = $('.statement', root); if (!st) return;
    const words = $$('.sw', st);
    if (RN.reduced) { words.forEach(w => w.classList.add('lit')); return; }
    const off = RN.onFrame((y, h) => { const r = st.getBoundingClientRect(); const p = RN.clamp((h * .82 - r.top) / (r.height + h * .35), 0, 1); const n = Math.round(p * words.length * 1.15); words.forEach((w, i) => w.classList.toggle('lit', i < n)); });
    RN.track(off);
  };
})();

/* R. N. Electronics — page builders */
(function () {
  'use strict';
  const RN = window.RN; const { $, $$, esc, icon, href } = RN;
  const H = (n, a) => RN.href(n, a);
  const L = (n, a) => `href="${H(n, a)}" data-link`;
  const btn = (label, attrs, kind, ic) => `<a class="btn btn--${kind || 'primary'}" ${attrs}><span class="btn__in">${label}${ic === false ? '' : ' ' + icon(ic || 'arrow')}</span></a>`;

  /* ---------------- shared blocks ---------------- */
  RN.phead = (o) => `<header class="phead"><div class="phead__bg"></div>${o.map ? '<canvas class="phead__net" data-map aria-hidden="true"></canvas>' : '<canvas class="phead__net" data-net="head" aria-hidden="true"></canvas>'}<div class="grid-bg"></div>
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a ${L('home')}>Home</a>${(o.crumbs || []).map(c => `<span aria-hidden="true">/</span>${c[1] ? `<a ${L(c[1], c[2])}>${esc(c[0])}</a>` : `<span aria-current="page">${esc(c[0])}</span>`}`).join('')}</nav>
      ${o.eyebrow ? `<p class="eyebrow" data-reveal>${esc(o.eyebrow)}</p>` : ''}
      <h1 data-split style="margin-top:1rem">${esc(o.title)}</h1>
      ${o.lede ? `<p class="lede" data-reveal style="--d:.2s">${o.lede}</p>` : ''}
      ${o.extra || ''}
    </div></header>`;

  RN.bandHTML = () => {
    const wa = RN.show(RN.C.contact.whatsapp) && RN.waHref('Hello R. N. Electronics, I have an enquiry.');
    return `<section class="sec--tight"><div class="wrap"><div class="band" data-reveal="scale">
      <div class="band__streaks" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="eyebrow">Business enquiries</p>
      <h2 style="margin-top:1rem" data-split>Tell us what the network needs.</h2>
      <p>Share the site, the equipment and the quantities. The team can then reply with options, pricing and availability in one go.</p>
      <div class="cta-row">${btn('Request a Quote', L('quote'))}${btn('Send Enquiry', L('contact'), 'glass', 'send')}${wa ? btn('Talk to Our Team', `href="${esc(wa)}" target="_blank" rel="noopener"`, 'glass', 'wa') : btn('Talk to Our Team', L('contact'), 'glass', 'headset')}<a class="link" ${L('products')}>Get Product Information ${icon('arrow')}</a></div>
    </div></div></section>`;
  };

  const seam = '<div class="seam" aria-hidden="true"></div>';
  const secHead = (eyebrow, title, lede, extra) => `<div class="sec-head"><div><p class="eyebrow" data-reveal>${esc(eyebrow)}</p><h2 class="h-2xl" data-split style="margin-top:1rem">${title}</h2></div>${lede ? `<p class="lede" data-reveal style="--d:.15s">${lede}</p>` : ''}${extra || ''}</div>`;

  RN.flowHTML = (s) => {
    if (!s) return '<div class="flow glass"></div>';
    const steps = [['Problem', s.problem, 'alert'], ['Technology', s.technology, 'cpu'], ['Solution', s.solution, 'spark'], ['Application', s.application, 'building']];
    const prods = s.products.map(RN.prod).filter(p => p && RN.show(p));
    return `<div class="flow glass" role="tabpanel" aria-label="${esc(s.name)}">
      <div class="flow__head"><h3 class="h-xl">${esc(s.name)} ${RN.flag(s)}</h3><a class="link" ${L('solutions', s.id)}>Details ${icon('arrow')}</a></div>
      <div class="flow__steps">
        <div class="flow__wire" aria-hidden="true"><svg class="wh" viewBox="0 0 100 2" preserveAspectRatio="none"><line class="base" x1="0" y1="1" x2="100" y2="1" vector-effect="non-scaling-stroke"/><line class="lit" x1="0" y1="1" x2="100" y2="1" pathLength="1" vector-effect="non-scaling-stroke"/></svg><svg class="wv" viewBox="0 0 2 100" preserveAspectRatio="none"><line class="base" x1="1" y1="0" x2="1" y2="100" vector-effect="non-scaling-stroke"/><line class="lit" x1="1" y1="0" x2="1" y2="100" pathLength="1" vector-effect="non-scaling-stroke"/></svg></div>
        ${steps.map((st, i) => `<div class="fstep" style="--i:${i}"><div class="fstep__node">${icon(st[2])}</div><div class="fstep__body"><div class="fstep__k">${st[0]}</div><p class="fstep__v">${esc(st[1])}</p></div></div>`).join('')}
        <div class="fstep fstep--cta" style="--i:4"><div class="fstep__node">${icon('send')}</div><div class="fstep__body"><div class="fstep__k">Enquiry</div><p class="fstep__v"><a class="link link--sig" ${L('quote', 'sol~' + s.id)}>Request a quote ${icon('arrow')}</a></p></div></div>
      </div>
      ${prods.length ? `<div class="flow__prods"><span class="mono dim">Equipment</span>${prods.map(p => `<a class="pill" ${L('product', p.id)}>${esc(p.name)}</a>`).join('')}</div>` : ''}
    </div>`;
  };

  RN.indPanelHTML = (d) => {
    const sols = d.solutions.map(RN.sol).filter(s => s && RN.show(s));
    return `<p class="eyebrow eyebrow--plain">${esc(d.name)} ${RN.flag(d)}</p><p class="ind__need">${esc(d.need)}</p>
      <div class="ind__sols">${sols.map(s => `<a class="pill" ${L('solutions', s.id)}>${esc(s.name)}</a>`).join('')}</div>
      <div class="cta-row">${btn('Talk to Our Team', L('quote'), 'glass')}</div>`;
  };

  const specsDL = (specs, n) => `<dl class="specs">${(specs || []).slice(0, n || 99).map(s => `<div><dt>${esc(s[0])}</dt><dd>${esc(s[1])}</dd></div>`).join('')}</dl>`;
  RN.pcard = (p, i) => {
    const c = RN.cat(p.category);
    return `<article class="pcard" data-tilt data-id="${esc(p.id)}" data-cat="${esc(p.category)}" data-reveal style="--d:${((i || 0) % 3) * .06}s">
      <a class="pcard__img" ${L('product', p.id)} aria-label="View ${esc(p.name)}">${RN.productVisual(p)}${RN.flag(p)}</a>
      <div class="pcard__body"><span class="pcard__cat">${esc(c ? c.name : '')}</span><h3><a ${L('product', p.id)}>${esc(p.name)}</a></h3><p>${esc(p.short)}</p>${specsDL(p.specs, 2)}
      <div class="pcard__foot"><span class="status">${esc(p.status || 'Enquire for availability')}</span><div class="pcard__actions"><a class="btn btn--glass btn--sm" ${L('quote', p.id)}><span class="btn__in">Enquire</span></a></div></div></div></article>`;
  };

  RN.contactInfoHTML = () => {
    const ct = RN.C.contact, st = RN.show(ct.hours) ? RN.openState() : null, rows = [];
    if (RN.show(ct.address)) rows.push(`<div class="cinfo"><span class="cinfo__ic">${icon('pin')}</span><div><div class="cinfo__k">Address ${RN.flag(ct.address)}</div><div class="cinfo__v"><span class="sel">${esc(ct.address.lines.join(', '))}</span>${RN.show(ct.landmark) && ct.landmark.text ? `<div class="dim" style="font-size:.875rem">${esc(ct.landmark.text)} ${RN.flag(ct.landmark)}</div>` : ''}<div style="margin-top:.5rem"><a class="link link--sig" href="${esc(ct.directionsUrl)}" target="_blank" rel="noopener">Get directions ${icon('arrowUR')}</a></div></div></div></div>`);
    if (RN.show(ct.phone) && ct.phone.value) rows.push(`<div class="cinfo"><span class="cinfo__ic">${icon('phone')}</span><div><div class="cinfo__k">Phone ${RN.flag(ct.phone)}</div><div class="cinfo__v"><a class="sel num" href="${RN.telHref(ct.phone.value)}">${esc(ct.phone.value)}</a><button class="copy" type="button" data-copy="${esc(ct.phone.value)}">${'Copy'}</button></div></div></div>`);
    if (RN.show(ct.email) && ct.email.value) rows.push(`<div class="cinfo"><span class="cinfo__ic">${icon('mail')}</span><div><div class="cinfo__k">Email ${RN.flag(ct.email)}</div><div class="cinfo__v"><a class="sel" href="mailto:${esc(ct.email.value)}">${esc(ct.email.value)}</a><button class="copy" type="button" data-copy="${esc(ct.email.value)}">Copy</button></div></div></div>`);
    if (RN.show(ct.whatsapp) && ct.whatsapp.value) rows.push(`<div class="cinfo"><span class="cinfo__ic">${icon('wa')}</span><div><div class="cinfo__k">WhatsApp ${RN.flag(ct.whatsapp)}</div><div class="cinfo__v"><a class="link link--sig" href="${esc(RN.waHref('Hello R. N. Electronics'))}" target="_blank" rel="noopener">Message on WhatsApp ${icon('arrowUR')}</a></div></div></div>`);
    if (RN.show(ct.hours)) rows.push(`<div class="cinfo"><span class="cinfo__ic">${icon('clock')}</span><div><div class="cinfo__k">Business hours (IST) ${RN.flag(ct.hours)}</div><div class="cinfo__v">${st ? `<span><span class="dot ${st.open ? 'dot--on' : 'dot--off'}"></span>${esc(st.text)}</span>` : ''}<dl class="hours">${RN.hoursRows()}</dl></div></div></div>`);
    if (!rows.length) rows.push(`<div class="empty"><h3>Contact details coming soon</h3><p>Use the enquiry form and the team will get back to you.</p></div>`);
    return rows.join('');
  };
  RN.mapHTML = () => `<div class="mapbox" data-reveal><canvas data-mapcanvas aria-hidden="true"></canvas>
    <div class="mapbox__card glass"><div><strong>Chittaranjan Avenue, Kolkata</strong><div class="mono">${RN.C.contact.geo.lat.toFixed(4)}° N · ${RN.C.contact.geo.lng.toFixed(4)}° E · stylised map</div></div><a class="btn btn--glass btn--sm" href="${esc(RN.C.contact.mapsUrl)}" target="_blank" rel="noopener"><span class="btn__in">Open in Google Maps ${icon('arrowUR')}</span></a></div></div>`;
  RN.faqHTML = (list) => `<div class="faq">${list.map(f => `<details data-reveal><summary><span class="q">${esc(f.q)} ${RN.flag(f)}</span><i aria-hidden="true"></i></summary><div class="ans">${esc(f.a)}</div></details>`).join('')}</div>`;

  const aboutBlock = (full) => {
    const C = RN.C, paras = RN.vis(C.company.about), facts = C.company.facts.filter(f => RN.show(f) && (f.value || !RN.isLive()));
    return `<div class="wrap about">
      <div class="about__copy"><p class="eyebrow" data-reveal>${full ? 'Company profile' : 'About R. N. Electronics'}</p><h2 class="h-3xl" data-split>${full ? 'Who we are' : esc(C.company.aboutHeadline)}</h2>
        ${paras.map((p, i) => `<p data-reveal style="--d:${.1 + i * .08}s">${esc(p.text)} ${RN.flag(p)}</p>`).join('')}
        ${full ? '' : `<p data-reveal><a class="link link--sig" ${L('about')}>More about us ${icon('arrow')}</a></p>`}</div>
      <div class="nameplate glass" data-reveal style="--d:.15s">
        <div class="nameplate__head"><span class="mono">Company data</span><span class="screws" aria-hidden="true"><i></i><i></i></span></div>
        <dl>${facts.map(f => `<div class="factrow"><dt>${esc(f.label)}</dt><dd>${f.value ? esc(f.value) : '<span class="dim">To be confirmed</span>'}${RN.flag(f)}</dd></div>`).join('')}</dl>
        <div class="coords" aria-label="Coordinates"><span>${C.contact.geo.lat.toFixed(4)}° N</span><span>${C.contact.geo.lng.toFixed(4)}° E</span><span>IST · UTC+05:30</span></div>
      </div></div>`;
  };

  /* ---------------- HOME ---------------- */
  RN.pages = {};
  RN.pages.home = () => {
    const C = RN.C, co = C.company, ct = C.contact;
    const st = RN.show(ct.hours) ? RN.openState() : null;
    const cats = RN.vis(C.categories), prods = RN.vis(C.products), sols = RN.vis(C.solutions), inds = RN.vis(C.industries), reasons = RN.vis(C.reasons), uses = RN.vis(C.useCases), brands = RN.vis(C.brands);
    const featured = prods.filter(p => p.featured).slice(0, 6);
    const hi = /^(fibre|access,?|switching,?|wireless,?|broadband|surveillance,?)$/i;
    const statement = esc(co.intro).split(/\s+/).map(w => `<span class="sw${hi.test(w) ? ' hi' : ''}">${w}</span>`).join(' ');
    const layers = [
      ['Fibre access', 'Where the network starts. Fibre arrives from the street, is terminated, and is converted for the building network.', 0],
      ['Switching & routing', 'The core of the site. Switches and routers decide where every packet goes and power devices over Ethernet.', 1],
      ['Wireless', 'Access points carry the network across floors and rooms, managed together so coverage stays even.', 2],
      ['Endpoints', 'Desks, cameras and TV outlets: the places where the network is finally used.', 3]
    ];
    return `
<section class="hero" id="top" aria-label="Introduction">
  <div class="hero__bg"><div class="grid-bg"></div></div>
  <div class="hero__stage"><canvas aria-hidden="true"></canvas><div class="hero__fallback" aria-hidden="true">${RN.art('switch')}</div></div>
  <div class="hero__fade"></div>
  <div class="hero__inner wrap"><div class="hero__content">
    <p class="eyebrow eyebrow--plain hero__eyebrow" data-reveal><span class="live" aria-hidden="true"></span>${esc(co.descriptor)} · Kolkata, India</p>
    <h1 class="hero__title" aria-label="${esc(co.name)}"><span class="l1" data-split>R. N.</span><span class="l2" data-split>Electronics</span></h1>
    <p class="hero__tag" data-reveal style="--d:.35s">${esc(co.tagline)}</p>
    ${RN.show({ verified: co.heroVerified }) ? `<p class="hero__line" data-reveal style="--d:.45s">${esc(co.heroLine)} ${RN.flag({ verified: co.heroVerified, source: co.heroSource })}</p><p class="hero__sub" data-reveal style="--d:.55s">${esc(co.heroSub)}</p>` : ''}
    <div class="cta-row hero__ctas" data-reveal style="--d:.65s">
      ${btn('Explore Solutions', 'href="#solutions-sec" data-scroll="#solutions-sec"')}
      ${btn('Contact R. N. Electronics', L('contact'), 'glass', false)}
      <a class="link link--sig" ${L('quote')}>Request a Quote ${icon('arrow')}</a>
    </div>
  </div></div>
  <div class="hero__meta"><div class="wrap"><div class="hero__status">
    ${st ? `<span><span class="dot ${st.open ? 'dot--on' : 'dot--off'}"></span><b>${esc(st.text)}</b></span>` : ''}
    ${RN.show(ct.address) ? `<span>C.R. Avenue · Kolkata 700072</span>` : ''}
    <span class="num">${ct.geo.lat.toFixed(4)}° N · ${ct.geo.lng.toFixed(4)}° E</span>
  </div><span class="scrollcue" aria-hidden="true"><i></i>Scroll</span></div></div>
</section>

<section class="intro" aria-label="Who we are"><div class="wrap">
  <p class="eyebrow" data-reveal>R. N. Electronics in one sentence</p>
  <p class="statement" style="margin-top:1.4rem">${statement}</p>
  ${brands.length ? `<div class="brandstrip" data-reveal><span class="brandstrip__label">Brands available ${brands.some(b => !b.verified) ? RN.flag({ verified: false, source: 'reviews' }) : ''}</span><div class="marquee"><div class="marquee__track">${brands.concat(brands).map(b => `<span class="marquee__item">${esc(b.name)}<span class="dim" aria-hidden="true">·</span></span>`).join('')}</div></div></div>` : ''}
</div></section>

<section class="sec" id="about-sec" style="isolation:isolate">${seam}<canvas class="about__net" data-net="about" aria-hidden="true"></canvas>${aboutBlock(false)}</section>

<section class="sec" id="products-sec">${seam}<div class="wrap">
  ${secHead('Products', 'Equipment for every layer of the network', 'Switching, wireless, fibre and broadband equipment, with the accessories that finish the job. Ask for current stock on any model.')}
  ${cats.length ? `<div class="bento">${cats.map((c, i) => { const n = prods.filter(p => p.category === c.id).length; return `<a class="tile" ${L('products', c.id)} data-tilt data-reveal style="--d:${i * .06}s"><div class="tile__art">${RN.art(c.art, c.name)}</div>${RN.flag(c)}<span class="tile__go" aria-hidden="true">${icon('arrowUR')}</span><div class="tile__meta"><div><h3>${esc(c.name)}</h3><p>${esc(c.short)}</p></div><span class="tile__count">${n} ${n === 1 ? 'LINE' : 'LINES'}</span></div></a>`; }).join('')}</div>` : `<div class="empty"><h3>The catalogue is being prepared</h3><p>Tell us what you need and the team will confirm availability.</p>${btn('Get Product Information', L('quote'))}</div>`}
  <div class="cta-row" style="margin-top:2rem">${btn('View all products', L('products'), 'glass', 'grid')}<a class="link" ${L('quote')}>Get Product Information ${icon('arrow')}</a></div>
</div></section>

${sols.length ? `<section class="sec" id="solutions-sec">${seam}<div class="wrap">
  ${secHead('Telecommunications solutions', 'Each solution, traced from the problem to the equipment', 'Pick a requirement to see the technology behind it, what we supply, and where it is used.')}
  <div class="solx"><div class="solx__list" role="tablist" aria-label="Solutions">${sols.map((s, i) => `<button class="solx__btn" role="tab" aria-selected="${i === 0}" data-sol="${esc(s.id)}"><strong>${esc(s.name)}</strong><span>${esc(s.short)}</span>${icon('arrow')}</button>`).join('')}</div>${RN.flowHTML(sols[0])}</div>
</div></section>` : `<section id="solutions-sec"></section>`}

${inds.length ? `<section class="sec" id="industries-sec">${seam}<div class="wrap">
  ${secHead('Industries served', 'Who the equipment is for', 'Hover or tap an industry to see the solutions that fit it.')}
  <div class="ind"><div class="ind__list">${inds.map((d, i) => `<button class="ind__item" data-ind="${esc(d.id)}"><b>${esc(d.name)}</b><i>${d.solutions.length} SOLUTION${d.solutions.length === 1 ? '' : 'S'}</i></button>`).join('')}</div>
    <div class="ind__stage"><div class="ind__bg"></div><canvas class="ind__canvas" aria-hidden="true"></canvas><div class="ind__art" style="color:var(--signal)"></div><div class="ind__panel"></div></div></div>
</div></section>` : ''}

<section class="infra" id="infra-sec" aria-label="Inside the connected infrastructure">
  <div class="infra__sticky">
    <canvas class="infra__canvas" aria-hidden="true"></canvas><div class="infra__shade"></div>
    <div class="infra__head"><div class="wrap"><p class="eyebrow">Technology &amp; capabilities</p><h2 class="h-2xl" style="max-width:14ch;margin-top:1rem">Inside the Connected Infrastructure</h2></div></div>
    ${layers.map(l => `<span class="infra__label">${esc(l[0])}</span>`).join('')}
    <div class="infra__steps"><div class="infra__wrap">${layers.map((l, i) => { const ps = prods.filter(p => { const c = RN.cat(p.category); return c && c.layer === l[2]; }); return `<div class="infra__panel glass${i === 0 ? ' is-on' : ''}"><span class="k">Layer ${i + 1} of 4</span><h3>${esc(l[0])}</h3><p>${esc(l[1])}</p>${ps.length ? `<div class="pills">${ps.slice(0, 4).map(p => `<a class="pill" ${L('product', p.id)}>${esc(p.name)}</a>`).join('')}</div>` : ''}</div>`; }).join('')}</div></div>
    <div class="infra__bar" aria-hidden="true">${layers.map(() => '<i><b></b></i>').join('')}</div>
  </div>
</section>

${reasons.length ? `<section class="sec">${seam}<div class="wrap">
  ${secHead('Why R. N. Electronics', 'Why work with us', 'Drawn from what customers say about buying here. No rankings and no inflated numbers.')}
  <div class="why">${reasons.map((r, i) => `<div class="why__cell" data-glow data-reveal style="--d:${(i % 3) * .07}s">${RN.flag(r)}<span class="why__icon">${icon(r.icon)}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}</div>
</div></section>` : ''}

<section class="sec">${seam}<div class="wrap">
  ${secHead('Applications', 'Technology in Application', 'How customers put the equipment to work. Verified project case studies appear here as they are published.')}
  ${uses.length ? `<div class="uses">${uses.map((u, i) => useCard(u, i)).join('')}</div>` : projectsEmpty()}
  <div class="cta-row" style="margin-top:2rem"><a class="link link--sig" ${L('applications')}>Applications &amp; projects ${icon('arrow')}</a></div>
</div></section>

${featured.length ? `<section class="hs sec--tight" id="featured" aria-label="Featured equipment"><div class="hs__pin">
  <div class="wrap hs__head"><div><p class="eyebrow">Featured equipment</p><h2 class="h-2xl" style="margin-top:1rem">In focus</h2></div><span class="hs__counter num"><b>01</b> / ${String(featured.length).padStart(2, '0')}</span></div>
  <div class="hs__track">${featured.map(p => { const c = RN.cat(p.category); return `<article class="hs__panel"><div class="hs__art">${RN.productVisual(p)}${RN.flag(p)}</div><div class="hs__info glass"><span class="k">${esc(c ? c.name : '')}</span><h3>${esc(p.name)}</h3><p>${esc(p.short)}</p>${specsDL(p.specs, 3)}<div class="cta-row">${btn('View Details', L('product', p.id), 'glass')}<a class="link link--sig" ${L('quote', p.id)}>Request Quote ${icon('arrow')}</a></div></div></article>`; }).join('')}</div>
</div></section>` : ''}

<section class="sec">${seam}<div class="wrap">
  ${secHead('Service & support', 'Before, during and after the order', 'What to expect at each stage of buying from R. N. Electronics.')}
  ${supportStages()}
  <div class="cta-row" style="margin-top:2rem"><a class="link link--sig" ${L('support')}>Service, support &amp; FAQs ${icon('arrow')}</a></div>
</div></section>

${RN.bandHTML()}

<section class="sec" id="contact-sec">${seam}<div class="wrap">
  ${secHead('Contact', 'Visit, call or write', '')}
  <div class="contact"><div class="contact__info glass" data-reveal>${RN.contactInfoHTML()}</div>${RN.mapHTML()}</div>
</div></section>`;
  };

  function useCard(u, i) {
    const d = RN.ind(u.industry);
    return `<article class="use" data-reveal style="--d:${(i % 3) * .07}s"><div class="use__img" style="color:var(--signal)">${RN.indArt(u.art)}</div><div class="use__body"><span class="use__ind">${esc(d ? d.name : '')} ${RN.flag(u, 'Customer-reported')}</span><h3>${esc(u.title)}</h3><p>${esc(u.summary)}</p><div class="use__eq">${u.equipment.map(e => `<span>${esc(e)}</span>`).join('')}</div></div></article>`;
  }
  function projectsEmpty() {
    return `<div class="empty"><h3>Project case studies are on their way</h3><p>Ask the team about installations similar to yours, or tell us about your site.</p>${btn('Talk to Our Team', L('contact'), 'glass')}</div>`;
  }
  function supportStages() {
    const stages = RN.C.support.stages.map(s => ({ stage: s.stage, items: RN.vis(s.items) })).filter(s => s.items.length);
    return `<div class="support">${stages.map((s, i) => `<div class="stage" data-reveal style="--d:${i * .1}s"><span class="support__wire" aria-hidden="true"></span><div class="stage__n"><b>${i + 1}</b>Stage ${i + 1} of ${stages.length}</div><h3>${esc(s.stage)}</h3>${s.items.map(it => `<div class="stage__item"><h4>${esc(it.title)} ${RN.flag(it, it.source === 'template' ? 'To complete' : 'Unverified')}</h4><p>${esc(it.text)}</p></div>`).join('')}</div>`).join('')}</div>`;
  }

  /* ---------------- ABOUT ---------------- */
  RN.pages.about = () => {
    const C = RN.C, cats = RN.vis(C.categories), brands = RN.vis(C.brands), parts = RN.vis(C.company.partnerships), certs = RN.vis(C.company.certifications), reasons = RN.vis(C.reasons);
    const p0 = RN.vis(C.company.about)[0];
    return RN.phead({ crumbs: [['About']], eyebrow: 'About us', title: C.company.aboutHeadline, lede: p0 ? esc(p0.text) : '' }) +
      `<section class="sec" style="isolation:isolate">${seam}<canvas class="about__net" data-net="about" aria-hidden="true"></canvas>${aboutBlock(true)}</section>
      ${cats.length ? `<section class="sec">${seam}<div class="wrap">${secHead('What we supply', 'Product categories', '')}
        <div class="adm__list" style="gap:0">${cats.map((c, i) => `<a class="ind__item" ${L('products', c.id)} data-reveal style="--d:${i * .05}s;gap:1.4rem"><span style="width:84px;flex:none">${RN.art(c.art, c.name)}</span><span style="display:grid;gap:.2rem;min-width:0"><b style="font-size:clamp(1.2rem,1rem + 1vw,1.7rem)">${esc(c.name)}</b><span class="muted" style="font-size:.9rem">${esc(c.short)}</span></span><i>${RN.flag(c) || 'VIEW'}</i></a>`).join('')}</div></div></section>` : ''}
      <section class="sec">${seam}<div class="wrap">${secHead('Credentials', 'Brands, partnerships and certifications', 'Listed only once confirmed by R. N. Electronics. Brand names belong to their owners.')}
        <div class="why" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${brands.map(b => `<div class="why__cell" data-glow style="min-height:150px">${RN.flag(b)}<h3 style="margin-top:0;font-stretch:120%">${esc(b.name)}</h3><p>${esc(b.note)}</p></div>`).join('') || ''}</div>
        <div style="display:grid;gap:14px;margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
          <div class="panel" style="padding:1.6rem"><p class="eyebrow eyebrow--plain">Partnerships</p>${parts.length ? parts.map(p => `<p style="margin-top:.9rem;font-size:1.1rem">${esc(p.text)} ${RN.flag(p)}</p>`).join('') : `<p class="muted" style="margin-top:.9rem">None listed yet.</p>`}</div>
          <div class="panel" style="padding:1.6rem"><p class="eyebrow eyebrow--plain">Certifications</p>${certs.length ? certs.map(p => `<p style="margin-top:.9rem;font-size:1.1rem">${esc(p.text)} ${RN.flag(p)}</p>`).join('') : `<p class="muted" style="margin-top:.9rem">None listed. Certifications appear here once they are added and confirmed in the content admin.</p>`}</div>
        </div></div></section>
      ${reasons.length ? `<section class="sec">${seam}<div class="wrap">${secHead('Why R. N. Electronics', 'What customers value', '')}<div class="why">${reasons.map((r, i) => `<div class="why__cell" data-glow data-reveal style="--d:${(i % 3) * .07}s">${RN.flag(r)}<span class="why__icon">${icon(r.icon)}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}</div></div></section>` : ''}
      ${RN.bandHTML()}`;
  };

  /* ---------------- PRODUCTS ---------------- */
  RN.pages.products = (arg) => {
    const C = RN.C, cats = RN.vis(C.categories), prods = RN.vis(C.products);
    const active = cats.find(c => c.id === arg) ? arg : '';
    return RN.phead({ crumbs: [['Products']], eyebrow: 'Products', title: 'Telecom & networking equipment', lede: 'Switching, wireless, fibre and optical, CATV/IPTV, surveillance and accessories. Stock changes often, so every line is quoted on request.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap">
        <div class="pfilter" role="toolbar" aria-label="Filter products"><button class="chipbtn" data-f="" aria-pressed="${!active}">All</button>${cats.map(c => `<button class="chipbtn" data-f="${esc(c.id)}" aria-pressed="${c.id === active}">${esc(c.name)}</button>`).join('')}
          <label class="search"><span class="sr">Search products</span>${icon('search')}<input id="psearch" type="search" placeholder="Search: switch, PoE, fibre, Wi-Fi 6…" autocomplete="off"></label></div>
        <div class="pgrid" id="pgrid">${prods.map(RN.pcard).join('')}<div class="empty noresults" hidden><h3>No matching products on this page</h3><p>The catalogue here is a selection. Ask the team about the exact model you need.</p>${btn('Get Product Information', L('quote'))}</div></div>
        ${!prods.length ? `<div class="empty"><h3>The catalogue is being prepared</h3><p>Tell us what you need and the team will confirm availability.</p>${btn('Get Product Information', L('quote'))}</div>` : ''}
        <p class="dim" style="margin-top:1.6rem;font-size:.85rem">Illustrations are representative drawings. Ask for datasheets and photographs of current stock.</p>
      </div></section>${RN.bandHTML()}`;
  };
  RN.mount_products = (root, arg) => {
    const grid = $('#pgrid', root); if (!grid) return; const chips = $$('.chipbtn', root), q = $('#psearch', root);
    let cat = (RN.vis(RN.C.categories).find(c => c.id === arg) || {}).id || '';
    const apply = () => {
      const term = (q.value || '').toLowerCase().trim(); let n = 0;
      $$('.pcard', grid).forEach(el => { const p = RN.prod(el.dataset.id) || {}; const text = [p.name, p.short, p.overview, (p.features || []).join(' '), (p.specs || []).map(s => s.join(' ')).join(' '), (p.brands || []).join(' ')].join(' ').toLowerCase(); const ok = (!cat || el.dataset.cat === cat) && (!term || term.split(/\s+/).every(t => text.includes(t))); el.hidden = !ok; if (ok) n++; });
      const nr = $('.noresults', grid); if (nr) nr.hidden = n > 0;
      chips.forEach(c => c.setAttribute('aria-pressed', c.dataset.f === cat ? 'true' : 'false'));
    };
    chips.forEach(c => c.addEventListener('click', () => { cat = c.dataset.f; apply(); }));
    q.addEventListener('input', apply); apply();
  };

  /* ---------------- PRODUCT DETAIL ---------------- */
  RN.pages.product = (id) => {
    const p = RN.prod(id); if (!p || !RN.show(p)) return RN.pages.notfound('That product is not in the catalogue.');
    const c = RN.cat(p.category); const imgs = p.images || [];
    const sols = RN.vis(RN.C.solutions).filter(s => s.products.includes(p.id));
    const related = RN.vis(RN.C.products).filter(x => x.id !== p.id && (x.category === p.category || sols.some(s => s.products.includes(x.id)))).slice(0, 3);
    const wa = RN.show(RN.C.contact.whatsapp) && RN.waHref('Enquiry about ' + p.name);
    return `<section class="sec" style="padding-top:calc(var(--nav-h) + 7rem)"><div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a ${L('home')}>Home</a><span aria-hidden="true">/</span><a ${L('products')}>Products</a>${c ? `<span aria-hidden="true">/</span><a ${L('products', c.id)}>${esc(c.name)}</a>` : ''}<span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span></nav>
      <div class="pd">
        <div class="gallery" data-reveal><div class="gallery__main" id="gmain" role="button" tabindex="0" aria-label="Zoom image">${RN.productVisual(p)}${imgs.length ? '' : '<span class="gallery__note">Representative illustration</span>'}</div>
          ${imgs.length > 1 ? `<div class="gallery__thumbs">${imgs.map((src, i) => `<button type="button" data-src="${esc(src)}" aria-pressed="${i === 0}" aria-label="Image ${i + 1}">${RN.imgTag(src, p.name + ' ' + (i + 1))}</button>`).join('')}</div>` : ''}</div>
        <div class="pd__info">
          <div><span class="pcard__cat">${esc(c ? c.name : '')}</span><h1 data-split style="margin-top:.6rem">${esc(p.name)}</h1></div>
          <p class="lede" data-reveal>${esc(p.short)} ${RN.flag(p)}</p>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap" data-reveal><span class="status">${esc(p.status || 'Enquire for availability')}</span>${(p.brands || []).map(b => `<span class="pill">${esc(b)}</span>`).join('')}</div>
          <div class="cta-row" data-reveal>${btn('Request Quotation', L('quote', p.id))}${wa ? btn('Talk to Our Team', `href="${esc(wa)}" target="_blank" rel="noopener"`, 'glass', 'wa') : btn('Contact Us', L('contact'), 'glass', 'phone')}${p.catalogueUrl ? `<a class="link link--sig" href="${esc(p.catalogueUrl)}" target="_blank" rel="noopener">Download catalogue ${icon('download')}</a>` : `<a class="link" ${L('quote', p.id)}>Request a datasheet ${icon('arrow')}</a>`}</div>
          <div class="pd__block" data-reveal><h2>Overview</h2><p class="muted">${esc(p.overview)}</p></div>
          ${p.features && p.features.length ? `<div class="pd__block" data-reveal><h2>Key features</h2><ul class="ticks">${p.features.map(f => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul></div>` : ''}
          ${p.specs && p.specs.length ? `<div class="pd__block" data-reveal><h2>Technical specifications</h2><div style="overflow-x:auto"><table class="table"><tbody>${p.specs.map(s => `<tr><th scope="row">${esc(s[0])}</th><td>${esc(s[1])}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
          ${p.applications && p.applications.length ? `<div class="pd__block" data-reveal><h2>Applications</h2><div class="ind__sols">${p.applications.map(a => `<span class="pill">${esc(a)}</span>`).join('')}</div></div>` : ''}
          ${sols.length ? `<div class="pd__block" data-reveal><h2>Used in solutions</h2><div class="ind__sols">${sols.map(s => `<a class="pill" ${L('solutions', s.id)}>${esc(s.name)}</a>`).join('')}</div></div>` : ''}
        </div>
      </div></div></section>
      ${related.length ? `<section class="sec">${seam}<div class="wrap">${secHead('Related', 'Related products', '')}<div class="pgrid">${related.map(RN.pcard).join('')}</div></div></section>` : ''}
      ${RN.bandHTML()}`;
  };
  RN.mount_product = (root) => {
    const m = $('#gmain', root); if (!m) return;
    const tog = () => m.classList.toggle('is-zoom');
    m.addEventListener('click', tog); m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    m.addEventListener('pointermove', (e) => { const r = m.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100; m.style.setProperty('--gx', x + '%'); m.style.setProperty('--gy', y + '%'); const v = m.querySelector('svg,img'); if (v) v.style.transformOrigin = `${x}% ${y}%`; });
    $$('.gallery__thumbs button', root).forEach(b => b.addEventListener('click', () => { $$('.gallery__thumbs button', root).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); const v = m.querySelector('img'); const src = b.dataset.src; if (v) { if (src.startsWith('media:')) { v.setAttribute('data-media', src.slice(6)); RN.resolveMedia(m); } else v.src = src; } }));
  };

  /* ---------------- SOLUTIONS ---------------- */
  RN.pages.solutions = () => {
    const sols = RN.vis(RN.C.solutions);
    return RN.phead({ crumbs: [['Solutions']], eyebrow: 'Telecommunications solutions', title: 'Solutions, from problem to equipment', lede: 'Each solution follows the same path: the problem on site, the technology that solves it, what we supply, where it applies, and how to enquire.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap" style="display:grid;gap:clamp(2rem,5vw,4rem)">${sols.length ? sols.map(s => `<div id="sol-${esc(s.id)}" style="scroll-margin-top:110px"><p class="eyebrow" data-reveal>${esc(s.short)}</p>${RN.flowHTML(s).replace('class="flow glass"', 'class="flow glass" data-autorun style="margin-top:1rem"')}</div>`).join('') : `<div class="empty"><h3>Solutions are being written up</h3><p>Tell us about your requirement.</p>${btn('Talk to Our Team', L('contact'))}</div>`}</div></section>${RN.bandHTML()}`;
  };
  RN.mount_solutions = (root, arg) => { if (arg) { const t = $('#sol-' + CSS.escape(arg), root); if (t) setTimeout(() => window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 100), 60); } };

  /* ---------------- INDUSTRIES ---------------- */
  RN.pages.industries = () => {
    const inds = RN.vis(RN.C.industries), uses = RN.vis(RN.C.useCases);
    return RN.phead({ crumbs: [['Industries']], eyebrow: 'Industries served', title: 'Who the equipment is for', lede: 'The customers who rely on R. N. Electronics, and the solutions each one usually needs.' }) +
      (inds.length ? `<section class="sec" style="padding-top:2rem"><div class="wrap"><div class="ind"><div class="ind__list">${inds.map(d => `<button class="ind__item" data-ind="${esc(d.id)}"><b>${esc(d.name)}</b><i>${d.solutions.length} SOLUTION${d.solutions.length === 1 ? '' : 'S'}</i></button>`).join('')}</div><div class="ind__stage"><div class="ind__bg"></div><canvas class="ind__canvas" aria-hidden="true"></canvas><div class="ind__art" style="color:var(--signal)"></div><div class="ind__panel"></div></div></div></div></section>
      <section class="sec">${seam}<div class="wrap">${secHead('In detail', 'Needs and matching solutions', '')}<div class="why">${inds.map((d, i) => { const us = uses.filter(u => u.industry === d.id); return `<div class="why__cell" data-glow data-reveal style="--d:${(i % 3) * .07}s">${RN.flag(d)}<span class="why__icon" style="width:56px;height:56px">${RN.indArt(d.art)}</span><h3>${esc(d.name)}</h3><p>${esc(d.need)}</p><div class="ind__sols">${d.solutions.map(RN.sol).filter(s => s && RN.show(s)).map(s => `<a class="pill" ${L('solutions', s.id)}>${esc(s.name)}</a>`).join('')}</div>${us.length ? `<p class="dim" style="font-size:.8rem">Use case: ${us.map(u => esc(u.title)).join(', ')}</p>` : ''}</div>`; }).join('')}</div></div></section>` : `<section class="sec"><div class="wrap"><div class="empty"><h3>Industry pages are being prepared</h3></div></div></section>`) + RN.bandHTML();
  };

  /* ---------------- APPLICATIONS ---------------- */
  RN.pages.applications = () => {
    const C = RN.C, projects = RN.vis(C.projects), uses = RN.vis(C.useCases), tests = RN.vis(C.testimonials);
    const caseCard = (p) => `<article class="case" data-reveal><div class="case__img" style="${p.image && !p.image.startsWith('media:') ? `background-image:url('${esc(p.image)}')` : ''}">${p.image ? (p.image.startsWith('media:') ? RN.imgTag(p.image, p.title) : '') : `<span style="color:var(--signal);width:40%">${RN.indArt((RN.ind(p.industry) || {}).art)}</span>`}</div><div class="case__body"><span class="use__ind">${esc((RN.ind(p.industry) || {}).name || p.industry || '')} ${RN.flag(p)}</span><h3 class="h-xl" style="font-size:1.35rem">${esc(p.title)}</h3><dl><div><dt>Requirement</dt><dd>${esc(p.requirement)}</dd></div><div><dt>Solution</dt><dd>${esc(p.solution)}</dd></div><div><dt>Equipment</dt><dd>${esc((p.equipment || []).join(', '))}</dd></div><div><dt>Result</dt><dd>${esc(p.result)}</dd></div></dl>${(p.products || []).length ? `<div class="ind__sols">${p.products.map(RN.prod).filter(x => x && RN.show(x)).map(x => `<a class="pill" ${L('product', x.id)}>${esc(x.name)}</a>`).join('')}</div>` : ''}</div></article>`;
    const template = `<article class="case template"><div class="case__img">PROJECT PHOTO</div><div class="case__body"><span class="use__ind">[Industry] <span class="flag">Template</span></span><h3 class="h-xl" style="font-size:1.35rem">[Project title]</h3><dl><div><dt>Requirement</dt><dd>[What the customer needed]</dd></div><div><dt>Solution</dt><dd>[What was supplied and why]</dd></div><div><dt>Equipment</dt><dd>[Models and quantities]</dd></div><div><dt>Result</dt><dd>[Outcome, in the customer's terms]</dd></div></dl></div></article>`;
    return RN.phead({ crumbs: [['Applications']], eyebrow: 'Applications & projects', title: 'Technology in Application', lede: 'Real installations only. Case studies are published here once the customer and the details are confirmed.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap">${secHead('Projects', 'Case studies', '')}
        ${projects.length ? `<div class="casegrid">${projects.map(caseCard).join('')}</div>` : `<div class="casegrid">${projectsEmpty()}${RN.isLive() ? '' : template}</div>${RN.isLive() ? '' : '<p class="dim" style="margin-top:1rem;font-size:.85rem">Preview only: the dashed card shows the structure each case study follows. Add projects in the content admin.</p>'}`}
      </div></section>
      ${uses.length ? `<section class="sec">${seam}<div class="wrap">${secHead('Use cases', 'How customers use the equipment', 'Described by customers in public reviews of R. N. Electronics.')}<div class="uses">${uses.map(useCard).join('')}</div></div></section>` : ''}
      ${tests.length ? `<section class="sec">${seam}<div class="wrap">${secHead('Testimonials', 'In customers’ words', '')}<div class="uses">${tests.map(t => `<figure class="use" style="padding:1.6rem;margin:0"><blockquote style="margin:0;font-size:1.05rem">“${esc(t.quote)}”</blockquote><figcaption class="dim" style="margin-top:1rem;font-size:.85rem">${esc(t.name)}${t.company ? ', ' + esc(t.company) : ''} ${RN.flag(t)}</figcaption></figure>`).join('')}</div></div></section>` : ''}
      ${RN.bandHTML()}`;
  };

  /* ---------------- SUPPORT ---------------- */
  RN.pages.support = () => {
    const faqs = RN.vis(RN.C.faqs);
    return RN.phead({ crumbs: [['Service & Support']], eyebrow: 'Service & support', title: 'Support at every stage', lede: 'Advice before you buy, delivery when you need it, and help after the sale.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap">${supportStages()}</div></section>
      ${faqs.length ? `<section class="sec">${seam}<div class="wrap faqwrap"><div><p class="eyebrow">FAQs</p><h2 class="h-2xl" data-split style="margin-top:1rem">Common questions</h2><p class="muted" style="margin-top:1rem">Not answered here? Ask the product desk at the bottom right, or send an enquiry.</p></div>${RN.faqHTML(faqs)}</div></section>` : ''}
      <section class="sec">${seam}<div class="wrap"><div class="contact"><div class="contact__info glass">${RN.contactInfoHTML()}</div>${RN.mapHTML()}</div></div></section>${RN.bandHTML()}`;
  };

  /* ---------------- QUOTE ---------------- */
  RN.pages.quote = (arg) => {
    const ct = RN.C.contact, st = RN.show(ct.hours) ? RN.openState() : null;
    return RN.phead({ crumbs: [['Request a Quote']], eyebrow: 'Request a quote', title: 'Request a Quote', lede: 'Tell us the product, the quantity and where it is going. The more specific the request, the faster and more complete the reply.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap formwrap">${RN.formHTML('quote', arg)}
        <aside class="aside glass"><h3>For a complete quote</h3><ul class="ticks">${['Model numbers, or the job the equipment must do', 'Quantities, including spares', 'Delivery location and timeline', 'Any brand preference'].map(t => `<li>${icon('check')}<span>${t}</span></li>`).join('')}</ul>
        ${RN.show(ct.phone) && ct.phone.value ? `<div class="cinfo"><span class="cinfo__ic">${icon('phone')}</span><div><div class="cinfo__k">Prefer to call? ${RN.flag(ct.phone)}</div><div class="cinfo__v"><span class="sel num">${esc(ct.phone.value)}</span><button class="copy" type="button" data-copy="${esc(ct.phone.value)}">Copy</button></div></div></div>` : ''}
        ${st ? `<p class="mono dim"><span class="dot ${st.open ? 'dot--on' : 'dot--off'}"></span>${esc(st.text)}</p>` : ''}</aside></div></section>`;
  };

  /* ---------------- CONTACT ---------------- */
  RN.pages.contact = () => {
    const faqs = RN.vis(RN.C.faqs).filter(f => /where|hours|deliver/i.test(f.q));
    return RN.phead({ map: true, crumbs: [['Contact']], eyebrow: 'Contact', title: 'Contact R. N. Electronics', lede: RN.show(RN.C.contact.address) ? esc(RN.C.contact.address.lines.join(', ')) : 'Send an enquiry and the team will reply.' }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap formwrap" style="grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)"><div class="contact__info glass" data-reveal>${RN.contactInfoHTML()}</div>${RN.formHTML('contact')}</div></section>
      <section class="sec sec--tight">${seam}<div class="wrap">${RN.mapHTML()}</div></section>
      ${faqs.length ? `<section class="sec sec--tight"><div class="wrap">${RN.faqHTML(faqs)}</div></section>` : ''}`;
  };

  /* ---------------- LEGAL ---------------- */
  const legal = (key, title) => () => {
    const L2 = RN.C.legal, secs = L2[key] || [];
    return RN.phead({ crumbs: [[title]], eyebrow: 'Legal', title, lede: `Last updated ${esc(RN.C.settings.legalUpdated || '')}` }) +
      `<section class="sec" style="padding-top:2rem"><div class="wrap legal"><nav class="legal__toc" aria-label="On this page">${secs.map((s, i) => `<a href="#${key}-${i}" data-scroll="#${key}-${i}">${esc(s.h)}</a>`).join('')}</nav>
      <div class="legal__body">${!L2.verified && !RN.isLive() ? `<div class="note">Template text. Have it reviewed and adapted before the site goes live.</div>` : ''}${secs.map((s, i) => `<h2 id="${key}-${i}">${esc(s.h)}</h2>${s.p.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}</div></div></section>`;
  };
  RN.pages.privacy = legal('privacy', 'Privacy Policy');
  RN.pages.terms = legal('terms', 'Terms & Conditions');
  RN.pages.disclaimer = legal('disclaimer', 'Disclaimer');

  RN.pages.notfound = (msg) => `<section class="nf"><div class="wrap"><div class="nf__code" aria-hidden="true">404</div><h1 class="h-xl" style="margin-top:1rem">Signal lost</h1><p class="muted" style="margin:1rem auto 2rem;max-width:44ch">${esc(msg || 'This page does not exist or has moved.')}</p><div class="cta-row" style="justify-content:center">${btn('Back to home', L('home'))}${btn('Browse products', L('products'), 'glass', 'grid')}</div></div></section>`;
})();

/* R. N. Electronics — enquiry system and product-desk assistant */
(function () {
  'use strict';
  const RN = window.RN; const { $, $$, esc, icon } = RN;
  const REQS = ['Quotation', 'Product information', 'Technical advice', 'Bulk / dealer supply', 'After-sales support', 'Other'];

  /* ---------------- form markup ---------------- */
  RN.formHTML = (kind, arg) => {
    const prods = RN.vis(RN.C.products), sols = RN.vis(RN.C.solutions);
    let pre = '';
    if (arg && arg.indexOf('sol~') === 0) pre = 'sol:' + arg.slice(4); else if (arg && RN.prod(arg)) pre = 'prod:' + arg;
    const opt = (v, l) => `<option value="${esc(v)}"${v === pre ? ' selected' : ''}>${esc(l)}</option>`;
    const id = (n) => `f-${kind}-${n}`;
    return `<form class="form glass" id="form-${kind}" novalidate data-kind="${kind}" data-reveal>
      <div class="formbody">
      <p class="eyebrow eyebrow--plain">${kind === 'quote' ? 'Quotation request' : 'Send an enquiry'}</p>
      <div class="fgrid" style="margin-top:1.2rem">
        <div class="field"><input id="${id('name')}" name="name" autocomplete="name" placeholder=" " required><label for="${id('name')}">Name *</label><span class="field__err" id="${id('name')}-e"></span></div>
        <div class="field"><input id="${id('company')}" name="company" autocomplete="organization" placeholder=" "><label for="${id('company')}">Company</label><span class="field__err"></span></div>
        <div class="field"><input id="${id('mobile')}" name="mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder=" " required><label for="${id('mobile')}">Mobile *</label><span class="field__err"></span></div>
        <div class="field"><input id="${id('email')}" name="email" type="email" inputmode="email" autocomplete="email" placeholder=" "><label for="${id('email')}">Email</label><span class="field__err"></span></div>
        <div class="field full"><select id="${id('product')}" name="product">${opt('', 'Not sure yet')}${prods.length ? `<optgroup label="Products">${prods.map(p => opt('prod:' + p.id, p.name)).join('')}</optgroup>` : ''}${sols.length ? `<optgroup label="Solutions">${sols.map(s => opt('sol:' + s.id, s.name)).join('')}</optgroup>` : ''}${opt('other', 'Something else')}</select><label for="${id('product')}">Product / Solution</label><span class="field__err"></span></div>
        <div class="field"><select id="${id('requirement')}" name="requirement" required><option value="" selected disabled hidden></option>${REQS.map(r => `<option${kind === 'quote' && r === 'Quotation' ? ' selected' : ''}>${r}</option>`).join('')}</select><label for="${id('requirement')}">Requirement *</label><span class="field__err"></span></div>
        <div class="field"><input id="${id('quantity')}" name="quantity" inputmode="numeric" placeholder=" " maxlength="12"><label for="${id('quantity')}">Quantity</label><span class="field__err"></span></div>
        <div class="field full"><input id="${id('location')}" name="location" autocomplete="address-level2" placeholder=" "><label for="${id('location')}">Delivery location / city</label><span class="field__err"></span></div>
        <div class="field full"><textarea id="${id('message')}" name="message" placeholder=" " maxlength="2000"></textarea><label for="${id('message')}">Message</label><span class="field__err"></span><span class="field__hint">Models, timelines, site details: anything that helps us reply in one go.</span></div>
        <div class="hp" aria-hidden="true"><label for="${id('website')}">Website</label><input id="${id('website')}" name="website" tabindex="-1" autocomplete="off"></div>
        <label class="consent full" for="${id('consent')}"><input id="${id('consent')}" name="consent" type="checkbox" required><span>I agree that R. N. Electronics may use these details to respond to my enquiry, as described in the <a class="link" href="${RN.href('privacy')}" data-link style="font-weight:500">Privacy Policy</a>.</span></label>
        <span class="field__err full" id="${id('consent')}-e"></span>
      </div>
      <div class="form__foot"><span class="form__msg" role="alert" aria-live="polite"></span><button class="btn btn--primary" type="submit"><span class="btn__in">${kind === 'quote' ? 'Request a Quote' : 'Send Enquiry'} ${icon('send')}</span></button></div>
      </div></form>`;
  };

  /* ---------------- validation ---------------- */
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const validMobile = (s) => { const raw = String(s || '').trim(); const d = digits(raw); if (/^(\+?91)?[6-9]\d{9}$/.test(d.length > 10 ? d.replace(/^0+/, '') : d)) return true; return raw.startsWith('+') && d.length >= 8 && d.length <= 15; };
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

  RN.mountForms = (root) => {
    $$('form.form', root).forEach(form => {
      const kind = form.dataset.kind, started = Date.now();
      const draftKey = 'rn-draft-' + kind;
      const d = RN.store.get(draftKey);
      if (d) Object.keys(d).forEach(k => { const el = form.elements[k]; if (el && el.type !== 'checkbox' && !el.value && k !== 'website') el.value = d[k]; });
      let saveT; form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) { f.classList.remove('is-bad'); const er = f.querySelector('.field__err'); if (er) er.textContent = ''; } clearTimeout(saveT); saveT = setTimeout(() => RN.store.set(draftKey, collect(form)), 500); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = collect(form), msg = $('.form__msg', form); msg.textContent = '';
        const errs = validate(form, data);
        if (errs) { msg.textContent = 'Please check the highlighted fields.'; const first = $('.is-bad input, .is-bad select, .is-bad textarea', form) || form.elements.consent; first && first.focus(); return; }
        /* spam protection: honeypot, time trap, link count, session rate limit */
        if (data.website) { showSent(form, { ok: true, ref: ref() }, data); return; }
        if (Date.now() - started < 2500) { msg.textContent = 'That was quick. Please check your details and submit again.'; return; }
        if ((data.message.match(/https?:\/\//g) || []).length > 2) { msg.textContent = 'Please remove links from the message.'; return; }
        const hist = (RN.store.get('rn-sent') || []).filter(t => Date.now() - t < 10 * 60 * 1000);
        if (hist.length >= 3) { msg.textContent = 'Several enquiries were sent from this browser in the last few minutes. Please wait, or call us directly.'; return; }
        const b = $('button[type=submit]', form); b.classList.add('is-busy'); b.disabled = true;
        const res = await RN.submitEnquiry(Object.assign({ source: kind === 'quote' ? 'Quote form' : 'Contact form' }, data));
        b.classList.remove('is-busy'); b.disabled = false;
        if (res.ok) { hist.push(Date.now()); RN.store.set('rn-sent', hist); RN.store.del(draftKey); }
        showSent(form, res, data);
      });
    });
  };
  function collect(form) {
    const o = {}; ['name', 'company', 'mobile', 'email', 'product', 'requirement', 'quantity', 'location', 'message', 'website'].forEach(k => { const el = form.elements[k]; o[k] = el ? String(el.value || '').trim() : ''; });
    o.consent = !!(form.elements.consent && form.elements.consent.checked); return o;
  }
  function validate(form, d) {
    const bad = {};
    if (d.name.length < 2) bad.name = 'Enter your name.';
    if (!d.mobile) bad.mobile = 'Enter a mobile number so the team can reach you.'; else if (!validMobile(d.mobile)) bad.mobile = 'Enter a 10-digit Indian mobile number, or an international number starting with +.';
    if (d.email && !validEmail(d.email)) bad.email = 'This email address looks incomplete.';
    if (!d.requirement) bad.requirement = 'Choose what you need.';
    if (d.quantity && !/^\d{1,7}$/.test(d.quantity.replace(/[,\s]/g, ''))) bad.quantity = 'Use numbers only.';
    if (d.requirement === 'Other' && d.message.length < 5) bad.message = 'Tell us a little about what you need.';
    if (!d.consent) bad.consent = 'Please agree so we can use your details to reply.';
    $$('.field', form).forEach(f => { const el = f.querySelector('input,select,textarea'); if (!el) return; const k = el.name; const er = f.querySelector('.field__err'); f.classList.toggle('is-bad', !!bad[k]); if (er) er.textContent = bad[k] || ''; if (el.setAttribute) el.setAttribute('aria-invalid', bad[k] ? 'true' : 'false'); });
    const ce = form.querySelector('[id$="-consent-e"]'); if (ce) ce.textContent = bad.consent || '';
    return Object.keys(bad).length ? bad : null;
  }
  const ref = () => { const d = new Date(); return 'RN-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); };
  RN.enquiryText = (d) => {
    const pl = d.product ? (d.product.startsWith('prod:') ? (RN.prod(d.product.slice(5)) || {}).name : d.product.startsWith('sol:') ? (RN.sol(d.product.slice(4)) || {}).name : 'Something else') : '';
    return ['Enquiry for R. N. Electronics', 'Name: ' + d.name, d.company && 'Company: ' + d.company, 'Mobile: ' + d.mobile, d.email && 'Email: ' + d.email, pl && 'Product / solution: ' + pl, d.requirement && 'Requirement: ' + d.requirement, d.quantity && 'Quantity: ' + d.quantity, d.location && 'Location: ' + d.location, d.message && 'Message: ' + d.message].filter(Boolean).join('\n');
  };

  /* ---------------- submission pipeline ---------------- */
  RN.submitEnquiry = async (data) => {
    const r = ref();
    const rec = { ref: r, at: new Date().toISOString(), name: data.name, company: data.company || '', mobile: data.mobile, email: data.email || '', product: data.product || '', requirement: data.requirement || '', quantity: data.quantity || '', location: data.location || '', message: data.message || '', source: data.source || 'Website', page: RN.parse().name, handled: false };
    await RN.capReady;
    const cap = RN.cap;
    if (cap.db && cap.uid) {
      try {
        const doc = cap.db.doc('enquiries/' + cap.uid);
        const snap = await doc.get(); const items = snap.exists ? (snap.data().items || []).slice(-40) : [];
        items.push(rec); await doc.set({ items, updated: rec.at });
        return { ok: true, ref: r, via: 'db' };
      } catch (e) { console.warn('db save failed', e); }
    }
    const ep = RN.C.settings.formEndpoint;
    if (ep && !RN.inArtifact()) {
      try {
        const res = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(rec) });
        if (res.ok) return { ok: true, ref: r, via: 'endpoint' };
      } catch (e) { console.warn('endpoint failed', e); }
    }
    return { ok: false, ref: r, text: RN.enquiryText(data) };
  };

  function showSent(form, res, data) {
    const body = $('.formbody', form) || form;
    const ct = RN.C.contact;
    if (res.ok) {
      body.innerHTML = `<div class="sent" role="status"><svg class="sent__svg" viewBox="0 0 120 120" aria-hidden="true"><line class="in" x1="0" y1="60" x2="22" y2="60"/><circle class="ring" cx="60" cy="60" r="38"/><circle class="arc" cx="60" cy="60" r="38" transform="rotate(-180 60 60)"/><path class="tick" d="M44 61l11 11 22-24"/></svg>
        <h3>Enquiry received</h3><p>Thank you, ${esc(data.name.split(' ')[0])}. The R. N. Electronics team will be in touch using the details you gave.</p><span class="sent__ref">Reference ${esc(res.ref)}</span>
        <div class="cta-row" style="justify-content:center;margin-top:.6rem"><a class="btn btn--glass btn--sm" href="${RN.href('products')}" data-link><span class="btn__in">Browse products</span></a><button type="button" class="link" data-again>Send another</button></div></div>`;
    } else {
      const ph = RN.show(ct.phone) ? ct.phone.value : '', em = RN.show(ct.email) ? ct.email.value : '', wa = RN.show(ct.whatsapp) && RN.waHref(res.text);
      body.innerHTML = `<div class="sent" role="status"><h3>Your enquiry is ready to send</h3><p>This copy of the website can't deliver forms on its own yet. Send it through one of these instead; the text below has everything you entered.</p>
        <div class="fallback"><pre id="fbtext">${esc(res.text)}</pre><div class="btn-row"><button class="btn btn--primary btn--sm" type="button" data-copy="${esc(res.text)}"><span class="btn__in">${icon('copy')} Copy enquiry</span></button>${wa ? `<a class="btn btn--glass btn--sm" href="${esc(wa)}" target="_blank" rel="noopener"><span class="btn__in">${icon('wa')} WhatsApp</span></a>` : ''}${em ? `<a class="btn btn--glass btn--sm" href="mailto:${esc(em)}?subject=${encodeURIComponent('Enquiry ' + res.ref)}&body=${encodeURIComponent(res.text)}"><span class="btn__in">${icon('mail')} Email</span></a>` : ''}</div>
        ${ph || em ? `<p class="dim" style="font-size:.85rem">${ph ? 'Phone: <span class="sel">' + esc(ph) + '</span>' : ''}${ph && em ? ' · ' : ''}${em ? 'Email: <span class="sel">' + esc(em) + '</span>' : ''}</p>` : ''}</div>
        <button type="button" class="link" data-again>Edit enquiry</button></div>`;
    }
    $$('[data-copy]', body).forEach(b => b.addEventListener('click', () => RN.copy(b.getAttribute('data-copy'), b)));
    const again = $('[data-again]', body);
    if (again) again.addEventListener('click', () => { const kind = form.dataset.kind; const fresh = document.createElement('div'); fresh.innerHTML = RN.formHTML(kind); const nf = fresh.firstElementChild; form.replaceWith(nf); nf.classList.remove('pre'); RN.mountForms(nf.parentElement); if (!res.ok) { Object.keys(data).forEach(k => { const el = nf.elements[k]; if (el && el.type !== 'checkbox' && k !== 'website') el.value = data[k]; }); } });
    form.scrollIntoView({ block: 'center', behavior: RN.reduced ? 'auto' : 'smooth' });
  }

  /* ---------------- product-desk assistant ---------------- */
  const SYN = { wifi: ['wireless', 'wi-fi', 'router', 'access point'], 'wi-fi': ['wireless', 'wifi'], fiber: ['fibre'], optical: ['fibre', 'sfp'], ont: ['onu', 'fibre'], onu: ['fibre'], gpon: ['onu', 'fibre'], epon: ['onu', 'fibre'], cctv: ['camera', 'surveillance'], cam: ['camera'], cameras: ['camera'], poe: ['poe', 'switch'], switches: ['switch'], routers: ['router'], ap: ['access point'], extender: ['range extender', 'extender'], booster: ['extender'], iptv: ['iptv', 'catv'], cable: ['catv', 'accessories', 'cabling'], tv: ['catv', 'iptv'], hotel: ['hotel', 'hospitality'], office: ['office'], vpn: ['vpn'], sfp: ['sfp', 'media converter'], converter: ['media converter'] };
  const STOP = new Set('a an the i me my we you your do does is are for of to in on and or with what which have has any need want looking about can please show tell from at it this that there some sell buy get price'.split(' '));
  function tokens(q) { const t = q.toLowerCase().replace(/[^a-z0-9\-\s+]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)); const out = new Set(t); t.forEach(w => (SYN[w] || []).forEach(s => out.add(s))); return Array.from(out); }
  function score(text, toks) { text = text.toLowerCase(); let s = 0; toks.forEach(t => { if (text.includes(t)) s += t.length > 3 ? 2 : 1; }); return s; }
  function search(q) {
    const toks = tokens(q); if (!toks.length) return { prods: [], sols: [], faqs: [] };
    const prods = RN.vis(RN.C.products).map(p => [p, score([p.name, p.name, p.short, p.overview, (p.features || []).join(' '), (p.specs || []).map(s => s.join(' ')).join(' '), (p.brands || []).join(' '), (RN.cat(p.category) || {}).name].join(' '), toks)]).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    const sols = RN.vis(RN.C.solutions).map(s => [s, score([s.name, s.name, s.short, s.problem, s.technology, s.application].join(' '), toks)]).filter(x => x[1] > 2).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
    const faqs = RN.vis(RN.C.faqs).filter(f => f.verified || !RN.isLive()).map(f => [f, score(f.q + ' ' + f.a, toks)]).filter(x => x[1] > 2).sort((a, b) => b[1] - a[1]).slice(0, 1).map(x => x[0]);
    return { prods, sols, faqs };
  }
  const pcardMini = (p) => `<a class="mcard" href="${RN.href('product', p.id)}" data-link><span class="mcard__art">${RN.art(p.art, p.name)}</span><span><b>${esc(p.name)}</b><small>${esc((RN.cat(p.category) || {}).name || '')}</small></span></a>`;

  RN.mountAssistant = () => {
    const box = $('#asst'); if (!box || box._m) return; box._m = 1;
    box.innerHTML = `<button class="asst__launch" id="asst-open" aria-expanded="false" aria-controls="asst-panel"><span class="asst__orb">${icon('chat')}</span><span class="t">Product desk<small>Ask about equipment</small></span></button>
      <section class="asst__panel glass" id="asst-panel" role="dialog" aria-label="R. N. Electronics product desk" aria-modal="false">
        <header class="asst__head"><span class="asst__orb">${icon('chat')}</span><div><h2>Product desk</h2><p>Answers from the R. N. Electronics catalogue</p></div><button class="asst__close" id="asst-close" aria-label="Close product desk">${icon('close')}</button></header>
        <div class="asst__log" id="asst-log" aria-live="polite"></div>
        <form class="asst__form" id="asst-form"><label class="sr" for="asst-in">Ask a question</label><input id="asst-in" placeholder="Try “PoE switch” or “fibre converter”" autocomplete="off" maxlength="200"><button aria-label="Send">${icon('send')}</button></form>
      </section>`;
    const log = $('#asst-log'), inp = $('#asst-in');
    let greeted = false;
    const open = (v) => { box.classList.toggle('is-open', v); $('#asst-open').setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) { if (!greeted) { greeted = true; greet(); } setTimeout(() => inp.focus({ preventScroll: true }), 300); } };
    RN.closeAssistant = () => open(false);
    $('#asst-open').addEventListener('click', () => open(!box.classList.contains('is-open')));
    $('#asst-close').addEventListener('click', () => open(false));
    const add = (html, me) => { const m = document.createElement('div'); m.className = 'msg ' + (me ? 'msg--me' : 'msg--bot'); m.innerHTML = `<div class="msg__b">${html}</div>`; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
    const bot = (html) => new Promise(res => { const t = add('<span class="typing"><i></i><i></i><i></i></span>'); setTimeout(() => { t.querySelector('.msg__b').innerHTML = html; log.scrollTop = log.scrollHeight; wire(t); res(t); }, RN.reduced ? 0 : 450 + Math.random() * 300); });
    const chips = (list) => `<div class="chips">${list.map(c => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
    function wire(el) {
      $$('[data-q]', el).forEach(b => b.addEventListener('click', () => ask(b.getAttribute('data-q'))));
      $$('a[data-link]', el).forEach(a => a.addEventListener('click', () => { if (innerWidth < 560) open(false); }));
      const f = $('form.mini', el); if (f) f.addEventListener('submit', async (e) => {
        e.preventDefault(); const d = { name: f.elements.n.value.trim(), mobile: f.elements.m.value.trim(), message: f.elements.q.value.trim(), requirement: 'Question from product desk', product: '', email: '', company: '', quantity: '', location: '', source: 'Product desk' };
        if (d.name.length < 2 || !validMobile(d.mobile)) { f.querySelector('.mini__err').textContent = 'Add your name and a valid mobile number.'; return; }
        f.querySelector('button').classList.add('is-busy');
        const res = await RN.submitEnquiry(d);
        f.outerHTML = res.ok ? `<p style="margin-top:.5rem">${icon('check')} Sent. Reference <span class="mono">${esc(res.ref)}</span>. The team will reply.</p>` : `<p style="margin-top:.5rem">This copy of the site can't send messages yet. Please use the details on the <a class="link" href="${RN.href('contact')}" data-link>Contact page</a>.</p>`;
      });
    }
    function greet() {
      bot(`Hello. I can help you find equipment in the R. N. Electronics catalogue, explain the categories, or pass a question to the team. I only answer from what is listed on this site.${chips(['Browse categories', 'Find a switch', 'Fibre equipment', 'Request a quote', 'Opening hours', 'Talk to the team'])}`);
    }
    async function ask(q) {
      add(esc(q), true); const t = q.toLowerCase(); const C = RN.C, ct = C.contact;
      if (/^(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/.test(t)) return bot('Hello. What equipment are you looking for?' + chips(['Browse categories', 'Request a quote']));
      if (/hour|open|close|timing|time|today|friday|sunday/.test(t)) { if (RN.show(ct.hours)) { const st = RN.openState(); return bot(`${st ? `<b>${esc(st.text)}</b> ${RN.flag(ct.hours)}` : ''}<dl class="hours">${RN.hoursRows()}</dl>`); } return bot('Business hours are not published yet. Please use the enquiry form.'); }
      if (/where|address|locat|direction|map|reach|metro/.test(t)) { if (RN.show(ct.address)) return bot(`${esc(ct.address.lines.join(', '))} ${RN.flag(ct.address)}<br><a class="link link--sig" href="${esc(ct.directionsUrl)}" target="_blank" rel="noopener">Directions ${icon('arrowUR')}</a>`); return bot('The address will be listed here soon.'); }
      if (/phone|call|number|contact|email|mail|whatsapp|talk|team|human|person|sales/.test(t)) {
        const ph = RN.show(ct.phone) && ct.phone.value, em = RN.show(ct.email) && ct.email.value, wa = RN.show(ct.whatsapp) && RN.waHref('Hello R. N. Electronics');
        return bot(`You can reach the team directly:${ph ? `<br>Phone: <span class="sel num">${esc(ph)}</span>` : ''}${em ? `<br>Email: <span class="sel">${esc(em)}</span>` : ''}${wa ? `<br><a class="link link--sig" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp ${icon('arrowUR')}</a>` : ''}<br>Or leave your number and question here:${miniForm()}`);
      }
      if (/quote|quotation|price|pricing|cost|rate|bulk|dealer/.test(t)) return bot(`Prices depend on model, quantity and stock, so every order is quoted. <a class="link link--sig" href="${RN.href('quote')}" data-link>Open the quote form ${icon('arrow')}</a>`);
      if (/categor|range|what do you (sell|supply|have)|products?$|catalog/.test(t)) { const cats = RN.vis(C.categories); return bot(cats.length ? `The catalogue covers:<div class="chips">${cats.map(c => `<a class="pill" href="${RN.href('products', c.id)}" data-link>${esc(c.name)}</a>`).join('')}</div>` : 'The catalogue is being prepared. Tell me what you need and I will pass it to the team.' + miniForm()); }
      if (/brand/.test(t)) { const b = RN.vis(C.brands); return bot(b.length ? `Brands listed on this site: ${b.map(x => esc(x.name)).join(', ')}. ${b.some(x => !x.verified) ? RN.flag({ verified: false, source: 'reviews' }) : ''} Ask the team for a specific model.` : 'Brands will be listed once confirmed.'); }
      if (/deliver|shipping|courier|same.?day/.test(t)) { const f = RN.vis(C.faqs).find(x => /deliver/i.test(x.q)); return bot(f ? esc(f.a) + ' ' + RN.flag(f) : 'Ask the team about delivery for your location.' + miniForm()); }
      if (/warrant|repair|rma|replace/.test(t)) { const f = RN.vis(C.faqs).find(x => /warranty/i.test(x.q)); return bot(f && f.verified ? esc(f.a) : `I don't have the warranty process on file yet, so I won't guess. The team can confirm it for your product.${miniForm()}`); }
      const r = search(q);
      if (r.prods.length || r.sols.length || r.faqs.length) {
        let html = r.prods.length ? `Here's what matches in the catalogue:<div class="msg__cards">${r.prods.map(pcardMini).join('')}</div>` : '';
        if (r.sols.length) html += `${html ? '<br>' : ''}Related solutions: ${r.sols.map(s => `<a class="link link--sig" href="${RN.href('solutions', s.id)}" data-link>${esc(s.name)}</a>`).join(', ')}`;
        if (r.faqs.length) html += `${html ? '<br><br>' : ''}<b>${esc(r.faqs[0].q)}</b><br>${esc(r.faqs[0].a)}`;
        html += `<br><span class="dim" style="font-size:12px">Stock changes often, so ask for availability on exact models.</span>${chips(['Request a quote'])}`;
        return bot(html);
      }
      return bot(`I couldn't find that in the catalogue on this site, and I don't want to guess. The team may still supply it. Leave your number and they can reply:${miniForm(q)}`);
    }
    const miniForm = (q) => `<form class="mini"><input name="n" placeholder="Your name" autocomplete="name" aria-label="Your name"><input name="m" placeholder="Mobile number" type="tel" inputmode="tel" aria-label="Mobile number"><textarea name="q" aria-label="Your question" placeholder="Your question">${esc(q || '')}</textarea><span class="mini__err field__err"></span><button class="btn btn--primary btn--sm" type="submit"><span class="btn__in">Send to the team</span></button></form>`;
    $('#asst-form').addEventListener('submit', (e) => { e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = ''; ask(q); });
  };
})();

/* R. N. Electronics — content admin (CMS) */
(function () {
  'use strict';
  const RN = window.RN; const { $, $$, esc, icon } = RN;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ARTS = ['switch', 'rackrouter', 'router', 'ap', 'extender', 'media', 'onu', 'catv', 'camera', 'accessory'];
  const IND_ARTS = ['hotel', 'rack', 'tower', 'office', 'gaming', 'home'];
  const ICONS = ['chat', 'layers', 'box', 'truck', 'headset', 'pin', 'shield', 'clock', 'wifi', 'fibre', 'switch', 'spark'];
  const V = [{ k: 'verified', label: 'Confirmed by R. N. Electronics', t: 'bool' }, { k: 'source', label: 'Source', t: 'source' }];
  const ids = (key) => () => (RN.A.draft[key] || []).map(x => [x.id, x.name || x.title || x.id]);
  const SCHEMA = {
    brands: { title: 'Brands', label: 'name', fields: [{ k: 'name', label: 'Brand name' }, { k: 'note', label: 'Relationship / note (admin only)' }], tpl: { name: 'New brand', note: '' } },
    categories: { title: 'Categories', label: 'name', fields: [{ k: 'id', label: 'ID (used in URLs; letters, digits, hyphens)' }, { k: 'name', label: 'Name' }, { k: 'short', label: 'Short description', t: 'textarea' }, { k: 'art', label: 'Illustration', t: 'select', opts: ARTS }, { k: 'layer', label: 'Network layer (3D section)', t: 'select', opts: [[0, 'Fibre access'], [1, 'Switching & routing'], [2, 'Wireless'], [3, 'Endpoints']], num: true }], tpl: { id: 'new-category', name: 'New category', short: '', art: 'switch', layer: 1 } },
    products: { title: 'Products', label: 'name', fields: [{ k: 'id', label: 'ID / URL slug' }, { k: 'name', label: 'Product name' }, { k: 'category', label: 'Category', t: 'select', opts: ids('categories') }, { k: 'art', label: 'Illustration (used when no photo)', t: 'select', opts: ARTS }, { k: 'featured', label: 'Feature in the home page showcase', t: 'bool' }, { k: 'short', label: 'Short description', t: 'textarea' }, { k: 'overview', label: 'Overview', t: 'textarea' }, { k: 'features', label: 'Key features (one per line)', t: 'list' }, { k: 'specs', label: 'Specifications (one per line: Name | Value)', t: 'specs' }, { k: 'applications', label: 'Applications (one per line)', t: 'list' }, { k: 'brands', label: 'Brands (one per line)', t: 'list' }, { k: 'status', label: 'Availability text' }, { k: 'images', label: 'Photos', t: 'images' }, { k: 'catalogueUrl', label: 'Catalogue / datasheet URL (https)' }], tpl: { id: 'new-product', name: 'New product', category: '', art: 'switch', featured: false, short: '', overview: '', features: [], specs: [], applications: [], brands: [], status: 'Enquire for availability', images: [], catalogueUrl: '' } },
    solutions: { title: 'Solutions', label: 'name', fields: [{ k: 'id', label: 'ID' }, { k: 'name', label: 'Name' }, { k: 'short', label: 'Short line' }, { k: 'problem', label: 'Problem', t: 'textarea' }, { k: 'technology', label: 'Technology', t: 'textarea' }, { k: 'solution', label: 'Solution', t: 'textarea' }, { k: 'application', label: 'Application', t: 'textarea' }, { k: 'products', label: 'Products used', t: 'ids', opts: ids('products') }], tpl: { id: 'new-solution', name: 'New solution', short: '', problem: '', technology: '', solution: '', application: '', products: [] } },
    industries: { title: 'Industries', label: 'name', fields: [{ k: 'id', label: 'ID' }, { k: 'name', label: 'Name' }, { k: 'need', label: 'What this industry needs', t: 'textarea' }, { k: 'art', label: 'Illustration', t: 'select', opts: IND_ARTS }, { k: 'solutions', label: 'Matching solutions', t: 'ids', opts: ids('solutions') }], tpl: { id: 'new-industry', name: 'New industry', need: '', art: 'office', solutions: [] } },
    useCases: { title: 'Use cases', label: 'title', fields: [{ k: 'id', label: 'ID' }, { k: 'title', label: 'Title' }, { k: 'industry', label: 'Industry', t: 'select', opts: ids('industries') }, { k: 'summary', label: 'Summary', t: 'textarea' }, { k: 'equipment', label: 'Equipment (one per line)', t: 'list' }, { k: 'products', label: 'Related products', t: 'ids', opts: ids('products') }, { k: 'art', label: 'Illustration', t: 'select', opts: IND_ARTS }], tpl: { id: 'new-use', title: 'New use case', industry: '', summary: '', equipment: [], products: [], art: 'office' } },
    projects: { title: 'Projects', label: 'title', fields: [{ k: 'id', label: 'ID' }, { k: 'title', label: 'Project title' }, { k: 'industry', label: 'Industry', t: 'select', opts: ids('industries') }, { k: 'requirement', label: 'Requirement', t: 'textarea' }, { k: 'solution', label: 'Solution', t: 'textarea' }, { k: 'equipment', label: 'Equipment (one per line)', t: 'list' }, { k: 'result', label: 'Result / outcome', t: 'textarea' }, { k: 'products', label: 'Related products', t: 'ids', opts: ids('products') }, { k: 'image', label: 'Project photo', t: 'image' }], tpl: { id: 'project-1', title: 'New project', industry: '', requirement: '', solution: '', equipment: [], result: '', products: [], image: '' } },
    testimonials: { title: 'Testimonials', label: 'name', fields: [{ k: 'name', label: 'Customer name (with permission)' }, { k: 'company', label: 'Company' }, { k: 'quote', label: 'Quote', t: 'textarea' }], tpl: { name: 'Customer', company: '', quote: '' } },
    reasons: { title: 'Why us', label: 'title', fields: [{ k: 'title', label: 'Title' }, { k: 'text', label: 'Text', t: 'textarea' }, { k: 'icon', label: 'Icon', t: 'select', opts: ICONS }], tpl: { title: 'New reason', text: '', icon: 'spark' } },
    faqs: { title: 'FAQs', label: 'q', fields: [{ k: 'q', label: 'Question' }, { k: 'a', label: 'Answer', t: 'textarea' }], tpl: { q: 'New question', a: '' } },
    'company.about': { title: 'About paragraphs', label: 'text', fields: [{ k: 'text', label: 'Paragraph', t: 'textarea' }], tpl: { text: '' } },
    'company.facts': { title: 'Company facts', label: 'label', fields: [{ k: 'label', label: 'Label' }, { k: 'value', label: 'Value (leave empty if unknown)' }], tpl: { label: 'New fact', value: '' } },
    'company.partnerships': { title: 'Partnerships', label: 'text', fields: [{ k: 'text', label: 'Partnership statement' }], tpl: { text: '' } },
    'company.certifications': { title: 'Certifications', label: 'text', fields: [{ k: 'text', label: 'Certification' }], tpl: { text: '' } },
    'contact.social': { title: 'Social links', label: 'name', fields: [{ k: 'name', label: 'Network' }, { k: 'url', label: 'URL' }], tpl: { name: 'Instagram', url: 'https://' } }
  };
  const TABS = [['overview', 'Overview'], ['company', 'Company'], ['contact', 'Contact'], ['brands', 'Brands'], ['categories', 'Categories'], ['products', 'Products'], ['solutions', 'Solutions'], ['industries', 'Industries'], ['useCases', 'Use cases'], ['projects', 'Projects'], ['testimonials', 'Testimonials'], ['reasons', 'Why us'], ['support', 'Support'], ['faqs', 'FAQs'], ['seo', 'SEO'], ['legal', 'Legal'], ['enquiries', 'Enquiries'], ['settings', 'Settings']];

  const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
  const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };

  RN.A = { draft: null, tab: 'overview', dirty: false, mode: 'local' };

  RN.pages.admin = () => `<section class="sec" style="padding-top:calc(var(--nav-h) + 6rem)"><div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${RN.href('home')}" data-link>Home</a><span aria-hidden="true">/</span><span aria-current="page">Content admin</span></nav>
    <div style="display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:1.6rem"><div><p class="eyebrow">CMS</p><h1 class="h-2xl" style="margin-top:.8rem">Content admin</h1></div><div id="adm-access" class="adm__state"><span class="skel" style="width:220px;height:20px;display:inline-block"></span></div></div>
    <div class="adm"><nav class="adm__nav glass" id="adm-nav" aria-label="Sections"></nav><div class="adm__main glass" id="adm-main"><div class="skel" style="height:280px"></div></div></div>
  </div></section>`;

  RN.mount_admin = async (root) => {
    const A = RN.A; A.draft = clone(RN.C); A.dirty = false;
    await RN.capReady; const cap = RN.cap;
    A.mode = cap.db ? (cap.canEdit ? 'db' : 'readonly') : (RN.inArtifact() ? 'nodb' : 'local');
    const acc = $('#adm-access', root);
    acc.innerHTML = A.mode === 'db' ? `<span class="vbadge vbadge--ok">Editor</span> Changes are saved to this site for every visitor.` : A.mode === 'readonly' ? `<span class="vbadge vbadge--no">View only</span> Only editors of this site can save changes.` : A.mode === 'nodb' ? `<span class="vbadge vbadge--no">Local</span> Saving isn't available in this view. Edit and export instead.` : `<span class="vbadge vbadge--no">Static site</span> Edits stay in this browser until you export content.json and upload it.`;
    renderNav(); renderTab();
    window.addEventListener('beforeunload', (e) => { if (RN.A.dirty && RN.parse().name === 'admin') { e.preventDefault(); e.returnValue = ''; } });
  };

  function renderNav() {
    const D = RN.A.draft;
    const unv = (k) => { const v = k === 'company' ? [].concat(D.company.about, D.company.facts, D.company.partnerships) : k === 'contact' ? [D.contact.address, D.contact.phone, D.contact.email, D.contact.whatsapp, D.contact.hours, D.contact.services, D.contact.landmark] : k === 'support' ? [].concat(...D.support.stages.map(s => s.items)) : Array.isArray(D[k]) ? D[k] : []; return v.filter(x => x && x.verified === false).length; };
    $('#adm-nav').innerHTML = TABS.map(([k, l]) => { const n = unv(k); return `<button type="button" data-tab="${k}" aria-current="${RN.A.tab === k}">${l}${n ? `<small title="Unconfirmed items">${n}</small>` : ''}</button>`; }).join('');
    $$('#adm-nav button').forEach(b => b.addEventListener('click', () => { RN.A.tab = b.dataset.tab; renderNav(); renderTab(); }));
  }
  function bar() {
    const A = RN.A;
    return `<div class="adm__bar"><div class="adm__state">${A.dirty ? '<span class="vbadge vbadge--no">Unsaved changes</span>' : '<span class="vbadge vbadge--ok">Up to date</span>'}</div><div class="btn-row">
      ${A.mode === 'db' ? `<button class="btn btn--primary btn--sm" type="button" data-act="save"><span class="btn__in">Save &amp; publish</span></button>` : `<button class="btn btn--primary btn--sm" type="button" data-act="apply"><span class="btn__in">Preview changes</span></button>`}
      <button class="btn-x" type="button" data-act="export">${'Export content.json'}</button><label class="btn-x" style="cursor:pointer">Import<input type="file" accept="application/json,.json" data-act="import" hidden></label></div></div>`;
  }
  function renderTab() {
    const main = $('#adm-main'), t = RN.A.tab;
    let html = bar();
    if (t === 'overview') html += overview();
    else if (t === 'company') html += objFields([['company.name', 'Company name'], ['company.descriptor', 'Business type'], ['company.tagline', 'Hero tagline'], ['company.heroLine', 'Hero headline'], ['company.heroSub', 'Hero sub-line', 'textarea'], ['company.heroVerified', 'Hero headline approved by R. N. Electronics', 'bool'], ['company.intro', 'One-sentence introduction', 'textarea'], ['company.aboutHeadline', 'About headline'], ['company.listingUrl', 'Google listing URL']]) + coll('company.about') + coll('company.facts') + coll('company.partnerships') + coll('company.certifications');
    else if (t === 'contact') html += contactTab();
    else if (t === 'support') html += supportTab();
    else if (t === 'seo') html += seoTab();
    else if (t === 'legal') html += legalTab();
    else if (t === 'settings') html += settingsTab();
    else if (t === 'enquiries') html += `<div id="enq">${RN.A.mode === 'db' ? '<div class="skel" style="height:120px"></div>' : enqInfo()}</div>`;
    else html += coll(t);
    main.innerHTML = html; wire(main);
    if (t === 'enquiries' && RN.A.mode === 'db') loadEnquiries();
    if (RN.A.mode === 'readonly') $$('input,textarea,select,button[data-op]', main).forEach(el => { if (!el.closest('.adm__bar')) el.disabled = true; });
  }

  /* ---------- field renderers ---------- */
  const srcOpts = (cur) => Object.keys(RN.A.draft.sources).concat(['owner']).map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${k === 'owner' ? 'R. N. Electronics (owner)' : esc(k)}</option>`).join('');
  function field(path, f) {
    const v = get(RN.A.draft, path), id = 'a-' + path.replace(/\./g, '-');
    const lab = `<label for="${id}">${esc(f.label)}</label>`;
    switch (f.t) {
      case 'textarea': return `<div class="af">${lab}<textarea id="${id}" data-path="${path}">${esc(v)}</textarea></div>`;
      case 'list': return `<div class="af">${lab}<textarea id="${id}" data-path="${path}" data-type="list">${esc((v || []).join('\n'))}</textarea></div>`;
      case 'specs': return `<div class="af">${lab}<textarea id="${id}" data-path="${path}" data-type="specs">${esc((v || []).map(s => s.join(' | ')).join('\n'))}</textarea></div>`;
      case 'bool': return `<div class="af af--row"><input type="checkbox" id="${id}" data-path="${path}" data-type="bool"${v ? ' checked' : ''}>${lab}</div>`;
      case 'source': return `<div class="af">${lab}<select id="${id}" data-path="${path}">${srcOpts(v)}</select><span class="adm__src">${esc(v === 'owner' ? 'Confirmed by R. N. Electronics' : RN.A.draft.sources[v] || '')}</span></div>`;
      case 'select': { const opts = typeof f.opts === 'function' ? f.opts() : f.opts; return `<div class="af">${lab}<select id="${id}" data-path="${path}"${f.num ? ' data-type="num"' : ''}><option value=""></option>${opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}"${String(ov) === String(v) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></div>`; }
      case 'ids': { const opts = f.opts(); return `<div class="af"><label>${esc(f.label)}</label><div style="display:flex;flex-wrap:wrap;gap:.4rem .9rem">${opts.map(([ov, ol]) => `<label class="af--row" style="display:flex;gap:.4rem;align-items:center;font-size:13px;color:var(--fg-2)"><input type="checkbox" data-path="${path}" data-type="ids" value="${esc(ov)}"${(v || []).includes(ov) ? ' checked' : ''} style="accent-color:var(--signal)">${esc(ol)}</label>`).join('')}</div></div>`; }
      case 'images': case 'image': { const arr = f.t === 'image' ? (v ? [v] : []) : (v || []); return `<div class="af"><label>${esc(f.label)}</label><div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">${arr.map((src, i) => `<span style="position:relative;width:84px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--hair-2);display:grid;place-items:center;background:var(--ink)">${RN.imgTag(src, '')}<button type="button" class="btn-x btn-x--bad" data-op="imgdel" data-path="${path}" data-i="${i}" data-single="${f.t === 'image'}" style="position:absolute;top:2px;right:2px;padding:0 6px" aria-label="Remove image">×</button></span>`).join('')}<label class="btn-x" style="cursor:pointer">${icon('upload')} Upload<input type="file" accept="image/*" hidden data-op="imgup" data-path="${path}" data-single="${f.t === 'image'}"></label></div><span class="adm__src">Photos are resized and saved as WebP. Without a photo, the illustration is shown.</span></div>`; }
      default: return `<div class="af">${lab}<input id="${id}" data-path="${path}" value="${esc(v)}"></div>`;
    }
  }
  function objFields(rows) { return `<div class="adm__list" style="margin-bottom:1.4rem">${rows.map(([p, l, t]) => field(p, { label: l, t })).join('')}</div>`; }
  function coll(key) {
    const S = SCHEMA[key]; const list = get(RN.A.draft, key) || [];
    return `<h2 class="h-xl" style="font-size:1.2rem;margin:1.2rem 0 .8rem">${esc(S.title)} <span class="dim mono">(${list.length})</span></h2>
      <div class="adm__list">${list.map((it, i) => `<details class="arow"><summary><b>${esc(it[S.label] || '(untitled)')}</b><span class="sp">${it.verified ? '<span class="vbadge vbadge--ok">Confirmed</span>' : '<span class="vbadge vbadge--no">Unconfirmed</span>'}<button type="button" class="btn-x" data-op="up" data-key="${key}" data-i="${i}" aria-label="Move up">↑</button><button type="button" class="btn-x" data-op="down" data-key="${key}" data-i="${i}" aria-label="Move down">↓</button><button type="button" class="btn-x btn-x--bad" data-op="del" data-key="${key}" data-i="${i}">Delete</button></span></summary>
        <div class="arow__body">${S.fields.map(f => field(`${key}.${i}.${f.k}`, f)).join('')}<div class="af2">${V.map(f => field(`${key}.${i}.${f.k}`, f)).join('')}</div></div></details>`).join('') || '<p class="dim">Nothing here yet.</p>'}</div>
      <div style="margin:.8rem 0 1.6rem"><button type="button" class="btn-x" data-op="add" data-key="${key}">${icon('plus')} Add ${esc(S.title.toLowerCase().replace(/s$/, ''))}</button></div>`;
  }
  function fact(path, label, withValue, t) { return `<div class="arow" style="padding:1rem"><div class="adm__list">${withValue === false ? '' : field(path + '.value', { label, t })}<div class="af2">${field(path + '.verified', V[0])}${field(path + '.source', V[1])}</div></div></div>`; }
  function contactTab() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return `<div class="adm__list">
      <div class="arow" style="padding:1rem"><div class="adm__list">${field('contact.address.lines', { label: 'Address (one line per row)', t: 'list' })}<div class="af2">${field('contact.address.street', { label: 'Street (for schema)' })}${field('contact.address.locality', { label: 'City' })}${field('contact.address.region', { label: 'State' })}${field('contact.address.postcode', { label: 'PIN code' })}</div><div class="af2">${field('contact.address.verified', V[0])}${field('contact.address.source', V[1])}</div></div></div>
      ${fact('contact.phone', 'Phone')}${fact('contact.email', 'Email')}${fact('contact.whatsapp', 'WhatsApp number with country code (e.g. 919800000000)')}
      <div class="arow" style="padding:1rem"><div class="adm__list"><p class="mono dim">Business hours (24h, e.g. 11:00-20:00; empty = closed)</p><div class="af2">${days.map(d => field('contact.hours.days.' + d, { label: RN.DAYN[d] })).join('')}</div><div class="af2">${field('contact.hours.verified', V[0])}${field('contact.hours.source', V[1])}</div></div></div>
      <div class="arow" style="padding:1rem"><div class="adm__list">${field('contact.services.items', { label: 'Service options (one per line)', t: 'list' })}<div class="af2">${field('contact.services.verified', V[0])}${field('contact.services.source', V[1])}</div></div></div>
      <div class="arow" style="padding:1rem"><div class="adm__list">${field('contact.landmark.text', { label: 'Landmark' })}<div class="af2">${field('contact.landmark.verified', V[0])}${field('contact.landmark.source', V[1])}</div></div></div>
      <div class="arow" style="padding:1rem"><div class="adm__list"><div class="af2">${field('contact.geo.lat', { label: 'Latitude' })}${field('contact.geo.lng', { label: 'Longitude' })}</div>${field('contact.mapsUrl', { label: 'Google Maps link' })}${field('contact.directionsUrl', { label: 'Directions link' })}</div></div>
    </div>${coll('contact.social')}`;
  }
  function supportTab() {
    return RN.A.draft.support.stages.map((s, si) => `<div class="arow" style="padding:1rem;margin-bottom:1rem"><div class="adm__list">${field(`support.stages.${si}.stage`, { label: 'Stage ' + (si + 1) + ' name' })}${s.items.map((it, i) => `<details class="arow"><summary><b>${esc(it.title)}</b><span class="sp">${it.verified ? '<span class="vbadge vbadge--ok">Confirmed</span>' : '<span class="vbadge vbadge--no">Unconfirmed</span>'}<button type="button" class="btn-x btn-x--bad" data-op="del" data-key="support.stages.${si}.items" data-i="${i}">Delete</button></span></summary><div class="arow__body">${field(`support.stages.${si}.items.${i}.title`, { label: 'Title' })}${field(`support.stages.${si}.items.${i}.text`, { label: 'Text', t: 'textarea' })}<div class="af2">${V.map(f => field(`support.stages.${si}.items.${i}.${f.k}`, f)).join('')}</div></div></details>`).join('')}<button type="button" class="btn-x" data-op="add" data-key="support.stages.${si}.items">${icon('plus')} Add item</button></div></div>`).join('');
  }
  function seoTab() { return `<p class="dim" style="margin-bottom:1rem;font-size:.9rem">Titles around 50–60 characters and descriptions around 140–160 read best in search results. These feed the static site build and the page titles here.</p><div class="adm__list">${Object.keys(RN.A.draft.seo).map(k => `<div class="arow" style="padding:1rem"><div class="adm__list"><p class="mono">${esc(k)}</p>${field(`seo.${k}.title`, { label: 'Title' })}${field(`seo.${k}.description`, { label: 'Description', t: 'textarea' })}</div></div>`).join('')}</div>`; }
  function legalTab() { const L2 = RN.A.draft.legal; return `<div class="adm__list">${field('legal.verified', { label: 'Legal text reviewed and approved', t: 'bool' })}${['privacy', 'terms', 'disclaimer'].map(k => `<h2 class="h-xl" style="font-size:1.2rem;margin-top:1rem">${k}</h2>${L2[k].map((s, i) => `<div class="arow" style="padding:1rem"><div class="adm__list">${field(`legal.${k}.${i}.h`, { label: 'Heading' })}${field(`legal.${k}.${i}.p`, { label: 'Paragraphs (one per line)', t: 'list' })}</div></div>`).join('')}`).join('')}</div>`; }
  function settingsTab() {
    return `<div class="adm__list">
      <div class="arow" style="padding:1rem"><div class="adm__list">${field('settings.mode', { label: 'Site mode', t: 'select', opts: [['preview', 'Preview: show everything, mark unconfirmed items'], ['live', 'Live: show confirmed items only']] })}<p class="adm__src">Live mode hides every item not marked “Confirmed by R. N. Electronics”. Sections with nothing confirmed show a short placeholder instead.</p></div></div>
      ${field('settings.siteUrl', { label: 'Site URL for canonical links and sitemap (e.g. https://www.example.in)' })}
      ${field('settings.formEndpoint', { label: 'Form endpoint for the self-hosted site (POST JSON, e.g. a Formspree or own API URL)' })}
      ${field('settings.ogImage', { label: 'Social share image URL (1200×630)' })}
      ${field('settings.legalUpdated', { label: 'Legal pages: last-updated date' })}
      <div class="arow" style="padding:1rem"><div class="adm__list"><p class="mono dim">Reset</p><p class="adm__src">Replace the draft with the content this site shipped with. Nothing is saved until you save or export.</p><div><button type="button" class="btn-x btn-x--bad" data-op="reset">Reset draft to shipped content</button></div></div></div></div>`;
  }
  function overview() {
    const D = RN.A.draft;
    const groups = [['Company', [].concat(D.company.about, D.company.facts, D.company.partnerships)], ['Contact', [D.contact.address, D.contact.phone, D.contact.email, D.contact.hours, D.contact.services]], ['Brands', D.brands], ['Categories', D.categories], ['Products', D.products], ['Solutions', D.solutions], ['Industries', D.industries], ['Use cases', D.useCases], ['Why us', D.reasons], ['FAQs', D.faqs]];
    const checks = [
      [D.contact.phone.verified && D.contact.address.verified && D.contact.hours.verified, 'Confirm address, phone and hours'],
      [!!D.contact.whatsapp.value, 'Add a WhatsApp number (optional)'],
      [!!(D.company.facts.find(f => f.label === 'Established') || {}).value, 'Add the year established (optional)'],
      [D.products.some(p => p.images && p.images.length), 'Upload product photos (illustrations are used until then)'],
      [D.projects.some(p => p.verified), 'Add at least one verified project'],
      [D.legal.verified, 'Have the legal pages reviewed'],
      [!!D.settings.siteUrl, 'Set the site URL (needed for sitemap and canonical links)'],
      [D.settings.mode === 'live', 'Switch the site to Live mode']
    ];
    return `<div class="adm__list">
      <div class="arow" style="padding:1.2rem"><p class="mono dim">Mode</p><p style="margin-top:.4rem;font-size:1.1rem">${D.settings.mode === 'live' ? '<span class="vbadge vbadge--ok">Live</span> Only confirmed items are visible.' : '<span class="vbadge vbadge--no">Preview</span> Everything is visible; unconfirmed items carry a marker.'}</p><p class="adm__src" style="margin-top:.4rem">Change it under Settings.</p></div>
      <div class="arow" style="padding:1.2rem"><p class="mono dim">Verification status</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.6rem;margin-top:.8rem">${groups.map(([n, l]) => { const tot = l.filter(Boolean).length, ok = l.filter(x => x && x.verified).length; return `<div style="border:1px solid var(--hair);border-radius:12px;padding:.8rem"><div class="mono dim" style="font-size:11px">${n}</div><div style="font-size:1.4rem;font-family:var(--f-display)" class="num">${ok}<span class="dim" style="font-size:1rem">/${tot}</span></div><div class="dim" style="font-size:12px">confirmed</div></div>`; }).join('')}</div></div>
      <div class="arow" style="padding:1.2rem"><p class="mono dim">Launch checklist</p><div class="checklist" style="margin-top:.8rem">${checks.map(([ok, t]) => `<div style="display:flex;gap:.6rem;align-items:center">${ok ? `<span style="color:var(--led)">${icon('check')}</span>`.replace('<svg', '<svg width="18" height="18"') : '<span style="width:18px;height:18px;border:1px solid var(--hair-2);border-radius:50%;display:inline-block"></span>'}<span>${t}</span></div>`).join('')}</div></div>
      <div class="arow" style="padding:1.2rem"><p class="mono dim">Where the facts came from</p>${Object.entries(D.sources).map(([k, v]) => `<p style="margin-top:.5rem;font-size:.9rem"><span class="mono">${esc(k)}</span> <span class="muted">${esc(v)}</span></p>`).join('')}</div>
    </div>`;
  }

  /* ---------- events ---------- */
  function markDirty() { if (!RN.A.dirty) { RN.A.dirty = true; const s = $('.adm__bar .adm__state'); if (s) s.innerHTML = '<span class="vbadge vbadge--no">Unsaved changes</span>'; } }
  function wire(main) {
    $$('[data-path]', main).forEach(el => {
      if (el.dataset.op) return;
      const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        const p = el.dataset.path, t = el.dataset.type; let v;
        if (t === 'bool') v = el.checked;
        else if (t === 'list') v = el.value.split('\n').map(s => s.trim()).filter(Boolean);
        else if (t === 'specs') v = el.value.split('\n').map(s => s.split('|').map(x => x.trim())).filter(a => a[0]).map(a => [a[0], a.slice(1).join(' | ')]);
        else if (t === 'num') v = el.value === '' ? '' : Number(el.value);
        else if (t === 'ids') { v = $$(`input[data-type="ids"][data-path="${p}"]`, main).filter(x => x.checked).map(x => x.value); }
        else if (/\.geo\.(lat|lng)$/.test(p)) v = parseFloat(el.value) || 0;
        else v = el.value;
        set(RN.A.draft, p, v); markDirty();
        if (t === 'bool' && /verified$/.test(p)) { const sum = el.closest('details') && el.closest('details').querySelector('summary .vbadge'); if (sum) { sum.className = 'vbadge ' + (v ? 'vbadge--ok' : 'vbadge--no'); sum.textContent = v ? 'Confirmed' : 'Unconfirmed'; } renderNav(); }
      });
    });
    $$('[data-op]', main).forEach(el => {
      const op = el.dataset.op;
      if (op === 'imgup') { el.addEventListener('change', () => upload(el)); return; }
      el.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const key = el.dataset.key, i = +el.dataset.i, list = key ? get(RN.A.draft, key) : null;
        if (op === 'add') { const tpl = SCHEMA[key] ? SCHEMA[key].tpl : { title: 'New item', text: '' }; list.push(Object.assign(clone(tpl), { verified: false, source: 'owner' })); }
        else if (op === 'up' && i > 0) list.splice(i - 1, 0, list.splice(i, 1)[0]);
        else if (op === 'down' && i < list.length - 1) list.splice(i + 1, 0, list.splice(i, 1)[0]);
        else if (op === 'del') { if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Confirm delete'; setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = 'Delete'; } }, 3500); return; } list.splice(i, 1); }
        else if (op === 'imgdel') { const p = el.dataset.path; if (el.dataset.single === 'true') set(RN.A.draft, p, ''); else get(RN.A.draft, p).splice(i, 1); }
        else if (op === 'reset') { if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to reset'; return; } RN.A.draft = clone(RN.defaults); }
        else return;
        markDirty(); const open = $$('details[open]', main).map(d => Array.from(d.parentElement.children).indexOf(d)); renderTab(); renderNav();
        $$('#adm-main .adm__list > details').forEach((d, k) => { if (open.includes(k)) d.open = true; });
      });
    });
    $$('[data-act]', main).forEach(el => {
      const a = el.dataset.act;
      if (a === 'import') { el.addEventListener('change', () => importJSON(el)); return; }
      el.addEventListener('click', () => { if (a === 'save') save(el); else if (a === 'apply') apply(); else if (a === 'export') exportJSON(); });
    });
  }
  function validateDraft(d) {
    const problems = [];
    ['categories', 'products', 'solutions', 'industries'].forEach(k => { const seen = new Set(); (d[k] || []).forEach(x => { if (!/^[a-z0-9][a-z0-9-]*$/.test(x.id || '')) problems.push(`${k}: “${x.name || x.id}” needs an ID using lowercase letters, digits and hyphens.`); if (seen.has(x.id)) problems.push(`${k}: duplicate ID “${x.id}”.`); seen.add(x.id); }); });
    (d.products || []).forEach(p => { if (p.catalogueUrl && !/^https:\/\//.test(p.catalogueUrl)) problems.push(`products: catalogue link for “${p.name}” must start with https://`); });
    if (JSON.stringify(d).length > 240000) problems.push('Content is too large to save. Remove embedded images or long text.');
    return problems;
  }
  async function save(btn) {
    const probs = validateDraft(RN.A.draft); if (probs.length) { RN.toast(probs[0], true); return; }
    btn.classList.add('is-busy'); btn.disabled = true;
    try { const d = clone(RN.A.draft); d.meta = Object.assign({}, d.meta, { updated: new Date().toISOString().slice(0, 10) }); await RN.cap.db.doc('site/content').set(d); RN.C = clone(d); RN.A.dirty = false; RN.renderChrome(); RN.toast('Saved. The site now shows these changes.'); renderTab(); }
    catch (e) { RN.toast(e && e.code === 'invalid_argument' ? 'Saving was refused. Only editors of this site can save.' : 'Could not save: ' + (e && e.message || 'unknown error'), true); }
    btn.classList.remove('is-busy'); btn.disabled = false;
  }
  function apply() { const probs = validateDraft(RN.A.draft); if (probs.length) { RN.toast(probs[0], true); return; } RN.C = clone(RN.A.draft); RN.renderChrome(); RN.toast('Applied to this browser. Export content.json to keep the changes.'); }
  async function exportJSON() { const d = clone(RN.A.draft); d.meta = Object.assign({}, d.meta, { updated: new Date().toISOString().slice(0, 10) }); await RN.saveFile('content.json', JSON.stringify(d, null, 2), 'application/json'); }
  function importJSON(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.company || !d.contact || !Array.isArray(d.products)) throw new Error('This file is not an R. N. Electronics content file.'); RN.A.draft = Object.assign(clone(RN.defaults), d); markDirty(); renderNav(); renderTab(); RN.toast('Imported. Review, then save or preview.'); } catch (e) { RN.toast(e.message || 'Could not read that file', true); } };
    r.readAsText(f);
  }
  async function upload(input) {
    const f = input.files && input.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { RN.toast('Choose an image file', true); return; }
    try {
      const url = await toWebP(f, 1000, 0.8);
      let ref = url;
      if (RN.A.mode === 'db') { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await RN.cap.db.doc('media/' + id).set({ data: url, name: f.name, created: new Date().toISOString() }); RN.media[id] = url; ref = 'media:' + id; }
      const p = input.dataset.path; if (input.dataset.single === 'true') set(RN.A.draft, p, ref); else get(RN.A.draft, p).push(ref);
      markDirty(); renderTab(); RN.toast(RN.A.mode === 'db' ? 'Photo uploaded. Save to publish.' : 'Photo embedded in the draft.');
    } catch (e) { RN.toast('Could not process that image: ' + (e.message || e), true); }
  }
  function toWebP(file, max, q) {
    return new Promise((res, rej) => {
      const img = new Image(); img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
        let qq = q, out = c.toDataURL('image/webp', qq);
        if (!/^data:image\/webp/.test(out)) out = c.toDataURL('image/jpeg', qq);
        while (out.length > 230000 && qq > 0.4) { qq -= 0.1; out = c.toDataURL(/^data:image\/webp/.test(out) ? 'image/webp' : 'image/jpeg', qq); }
        if (out.length > 240000) return rej(new Error('image is too detailed; try a smaller photo'));
        URL.revokeObjectURL(img.src); res(out);
      };
      img.onerror = () => rej(new Error('unreadable image')); img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- enquiries ---------- */
  function enqInfo() {
    return RN.A.mode === 'local' ? `<div class="empty"><h3>Enquiries go to your form endpoint</h3><p>This static copy of the site has no database. Set a form endpoint under Settings (for example a Formspree form or your own API). Submissions are sent there as JSON. Without an endpoint, visitors are offered WhatsApp, email or a copyable summary instead.</p></div>` : `<div class="empty"><h3>Enquiries are not available in this view</h3><p>Open the site as its editor to see submitted enquiries.</p></div>`;
  }
  let enqCache = [];
  async function loadEnquiries() {
    const box = $('#enq');
    try {
      const snap = await RN.cap.db.collection('enquiries').get();
      enqCache = []; snap.docs.forEach(d => (d.data().items || []).forEach((it, i) => enqCache.push(Object.assign({ _doc: d.id, _i: i }, it))));
      enqCache.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      const pl = (v) => v ? (v.startsWith('prod:') ? (RN.prod(v.slice(5)) || {}).name || v : v.startsWith('sol:') ? (RN.sol(v.slice(4)) || {}).name || v : v) : '';
      box.innerHTML = enqCache.length ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap"><p class="muted">${enqCache.length} enquir${enqCache.length === 1 ? 'y' : 'ies'}, newest first.</p><button type="button" class="btn-x" id="enq-csv">${icon('download')} Export CSV</button></div><div class="adm__list">${enqCache.map((e, k) => `<div class="enq"><div class="enq__top"><b>${esc(e.name)}${e.company ? ' · ' + esc(e.company) : ''}</b><span class="mono dim">${esc((e.at || '').replace('T', ' ').slice(0, 16))} · ${esc(e.ref)}</span></div><dl><dt>Mobile</dt><dd class="sel">${esc(e.mobile)}</dd>${e.email ? `<dt>Email</dt><dd class="sel">${esc(e.email)}</dd>` : ''}<dt>Need</dt><dd>${esc(e.requirement)}${pl(e.product) ? ' · ' + esc(pl(e.product)) : ''}${e.quantity ? ' · Qty ' + esc(e.quantity) : ''}</dd>${e.location ? `<dt>Location</dt><dd>${esc(e.location)}</dd>` : ''}${e.message ? `<dt>Message</dt><dd>${esc(e.message)}</dd>` : ''}<dt>Source</dt><dd>${esc(e.source || '')}</dd></dl><div><label class="af--row" style="display:inline-flex;gap:.5rem;align-items:center;font-size:13px;color:var(--fg-2)"><input type="checkbox" data-enq="${k}"${e.handled ? ' checked' : ''} style="accent-color:var(--signal)"> Handled</label></div></div>`).join('')}</div>` : `<div class="empty"><h3>No enquiries yet</h3><p>Submissions from the quote form, contact form and product desk appear here.</p></div>`;
      const csv = $('#enq-csv'); if (csv) csv.addEventListener('click', () => { const cols = ['at', 'ref', 'name', 'company', 'mobile', 'email', 'requirement', 'product', 'quantity', 'location', 'message', 'source', 'handled']; const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; RN.saveFile('rn-enquiries.csv', [cols.join(',')].concat(enqCache.map(e => cols.map(c => q(c === 'product' ? pl(e[c]) : e[c])).join(','))).join('\n'), 'text/csv'); });
      $$('[data-enq]', box).forEach(cb => cb.addEventListener('change', async () => {
        const e = enqCache[+cb.dataset.enq]; cb.disabled = true;
        try { const ref = RN.cap.db.doc('enquiries/' + e._doc); const s = await ref.get(); const items = (s.data().items || []).slice(); if (items[e._i]) { items[e._i] = Object.assign({}, items[e._i], { handled: cb.checked }); await ref.set(Object.assign({}, s.data(), { items })); e.handled = cb.checked; } }
        catch (err) { cb.checked = !cb.checked; RN.toast('Could not update: ' + (err.message || 'error'), true); }
        cb.disabled = false;
      }));
    } catch (e) { box.innerHTML = `<div class="empty"><h3>Could not load enquiries</h3><p>${esc(e && e.message || 'Unknown error')}</p></div>`; }
  }
})();

/* R. N. Electronics — render loop, SEO metadata, boot */
(function () {
  'use strict';
  const RN = window.RN; const { $, $$, esc } = RN;

  const TITLES = { home: 'home', about: 'about', products: 'products', product: 'products', solutions: 'solutions', industries: 'industries', applications: 'applications', support: 'support', quote: 'quote', contact: 'contact', privacy: 'privacy', terms: 'terms', disclaimer: 'disclaimer' };

  RN.setMeta = (r) => {
    const C = RN.C, seo = C.seo[TITLES[r.name]] || C.seo.home;
    let title = seo.title, desc = seo.description;
    if (r.name === 'product') { const p = RN.prod(r.arg); if (p) { title = `${p.name} | R. N. Electronics`; desc = p.short; } }
    if (r.name === 'admin') title = 'Content admin | R. N. Electronics';
    if (!RN.pages[r.name] && r.name !== 'product') title = 'Page not found | R. N. Electronics';
    document.title = title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute('content', desc);
    const og = $('meta[property="og:title"]'); if (og) og.setAttribute('content', title);
    const od = $('meta[property="og:description"]'); if (od) od.setAttribute('content', desc);
    let ld = $('#ld-json'); if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ld-json'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify(RN.schema(r));
  };

  /* structured data: only confirmed facts are published */
  RN.schema = (r) => {
    const C = RN.C, ct = C.contact, base = C.settings.siteUrl || '';
    const org = { '@type': ['Organization', 'LocalBusiness'], '@id': (base || '') + '#org', name: C.company.name, description: C.company.descriptor };
    if (base) org.url = base;
    if (ct.address.verified) org.address = { '@type': 'PostalAddress', streetAddress: ct.address.street, addressLocality: ct.address.locality, addressRegion: ct.address.region, postalCode: ct.address.postcode, addressCountry: ct.address.country };
    if (ct.address.verified) org.geo = { '@type': 'GeoCoordinates', latitude: ct.geo.lat, longitude: ct.geo.lng };
    if (ct.phone.verified && ct.phone.value) org.telephone = ct.phone.value;
    if (ct.email.verified && ct.email.value) org.email = ct.email.value;
    if (ct.hours.verified) { const map = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }; org.openingHoursSpecification = Object.entries(ct.hours.days).filter(([, v]) => v).map(([d, v]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: map[d], opens: v.split('-')[0], closes: v.split('-')[1] })); }
    const sameAs = (ct.social || []).filter(s => s.verified).map(s => s.url); if (sameAs.length) org.sameAs = sameAs;
    const graph = [org];
    if (r.name !== 'home') {
      const crumbs = [['Home', base + '/']];
      const label = { about: 'About', products: 'Products', product: 'Products', solutions: 'Solutions', industries: 'Industries', applications: 'Applications', support: 'Service & Support', quote: 'Request a Quote', contact: 'Contact', privacy: 'Privacy Policy', terms: 'Terms & Conditions', disclaimer: 'Disclaimer' }[r.name];
      if (label) crumbs.push([label, base + '/' + (r.name === 'product' ? 'products' : r.name) + '/']);
      if (r.name === 'product') { const p = RN.prod(r.arg); if (p) crumbs.push([p.name, base + '/products/' + p.id + '/']); }
      graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: base ? c[1] : undefined })) });
    }
    if (r.name === 'product') { const p = RN.prod(r.arg); if (p && p.verified) graph.push({ '@type': 'Product', name: p.name, description: p.overview, category: (RN.cat(p.category) || {}).name, brand: p.brands && p.brands[0] ? { '@type': 'Brand', name: p.brands[0] } : undefined, offers: { '@type': 'Offer', availability: 'https://schema.org/InStoreOnly', seller: { '@id': (base || '') + '#org' } } }); }
    if (r.name === 'support') { const f = C.faqs.filter(x => x.verified); if (f.length) graph.push({ '@type': 'FAQPage', mainEntity: f.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }); }
    return { '@context': 'https://schema.org', '@graph': graph };
  };

  let first = true;
  RN.render = () => {
    const r = RN.parse(); const main = $('#main');
    RN.cleanup();
    let html;
    try {
      if (r.name === 'product') html = RN.pages.product(r.arg);
      else if (RN.pages[r.name]) html = RN.pages[r.name](r.arg);
      else html = RN.pages.notfound();
    } catch (e) { console.error(e); html = RN.pages.notfound('Something went wrong while loading this page. Please try again.'); }
    main.innerHTML = html;
    if (!first) window.scrollTo(0, 0);
    if (RN.smooth) { RN.smooth.active = false; }
    RN.setMeta(r); RN.markNav();
    RN.enhance(main);
    try {
      if (r.name === 'home') { RN.mountHero(main); RN.mountStatement(main); RN.mountInfra(main); RN.mountHS(main); }
      RN.mountSolx(main); RN.mountInd(main); RN.mountForms(main);
      $$('canvas[data-map], canvas[data-mapcanvas]', main).forEach(c => RN.mapCanvas(c));
      const hook = RN['mount_' + r.name]; if (hook) hook(main, r.arg);
    } catch (e) { console.error(e); }
    main.focus({ preventScroll: true });
    RN.txIn(); first = false;
  };

  /* merge stored CMS content over shipped defaults (keeps new keys from code updates) */
  const merge = (base, over) => { if (Array.isArray(over) || typeof over !== 'object' || over === null) return over; const out = Object.assign({}, base); Object.keys(over).forEach(k => { out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null) ? merge(base[k], over[k]) : over[k]; }); return out; };

  function boot() {
    document.documentElement.classList.toggle('js-motion', !RN.reduced);
    RN.renderChrome(); RN.mountAssistant(); RN.render();
    const cl = $('#cursorlight'); if (cl && RN.fine && !RN.reduced) cl.hidden = false;
    /* Self-hosted build: content.json on the server can be replaced without a rebuild */
    if (RN.router === 'path') {
      fetch(RN.base + 'assets/content.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
        if (!j || !j.company) return; const next = merge(RN.defaults, j);
        if (JSON.stringify(next) !== JSON.stringify(RN.C)) { RN.C = next; RN.renderChrome(); const y = scrollY; RN.render(); window.scrollTo(0, y); }
      }).catch(() => { });
    }
    /* Pull edited content from the site's store, when this view has one */
    RN.capReady.then(async (cap) => {
      if (!cap.db) return;
      try {
        const snap = await cap.db.doc('site/content').get();
        if (snap.exists) {
          const stored = snap.data(); const next = merge(RN.defaults, stored);
          if (JSON.stringify(next) !== JSON.stringify(RN.C)) {
            const active = document.activeElement; const typing = active && /INPUT|TEXTAREA|SELECT/.test(active.tagName);
            RN.C = next; RN.renderChrome();
            if (!typing) { const y = scrollY; RN.render(); window.scrollTo(0, y); }
          }
        }
      } catch (e) { console.warn('content load failed', e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
