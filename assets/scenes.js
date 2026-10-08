/* Scenes for the R. N. Electronics site, built on glkit.
   HeroScene  — a rack assembly (fibre patch panel, 24-port switch, 2U fibre chassis)
                with aqua fibre runs to floating nodes, a sector antenna and a PCB.
   InfraScene — "Inside the connected infrastructure": a building section that
                assembles layer by layer as the visitor scrolls. */
(function (global) {
  'use strict';
  const { Geo, LineGeo, Renderer, hex, bezier, samplePath } = global.GLK;
  const raw = (h) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const rgba = (h, a) => raw(h).concat([a]);
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  const MAT = {
    chassis: { color: hex('#2a313b'), metal: 0.85, rough: 0.38 },
    face: { color: hex('#b9c3cf'), metal: 1.0, rough: 0.42 },
    faceDark: { color: hex('#1a2029'), metal: 0.7, rough: 0.5 },
    port: { color: hex('#05070a'), metal: 0.2, rough: 0.85 },
    cage: { color: hex('#8b95a2'), metal: 1.0, rough: 0.3 },
    lc: { color: hex('#2f6fd6'), metal: 0.1, rough: 0.45 },
    rail: { color: hex('#3a424e'), metal: 0.9, rough: 0.35 },
    fibre: { color: hex('#2ec4d8'), metal: 0.0, rough: 0.35, emis: [0.02, 0.09, 0.11] },
    node: { color: hex('#c9d3df'), metal: 1.0, rough: 0.18 },
    radome: { color: hex('#d9dee5'), metal: 0.0, rough: 0.55 },
    pcb: { color: hex('#0a1622'), metal: 0.3, rough: 0.55 },
    chip: { color: hex('#0b0d10'), metal: 0.4, rough: 0.35 },
    glass: { color: hex('#0e2238'), metal: 0.0, rough: 0.06, opacity: 0.22, transparent: true },
    screen: { color: hex('#06121c'), metal: 0.0, rough: 0.2, emis: [0.0, 0.05, 0.09] }
  };

  /* ===================================================================== */
  class HeroScene {
    constructor(canvas, opts) {
      this.lite = !!opts.lite; this.canvas = canvas;
      this.r = new Renderer(canvas, { antialias: !this.lite, dpr: this.lite ? 1.25 : 1.75, lowPower: this.lite });
      this.t = 0; this.mx = 0; this.my = 0; this.tmx = 0; this.tmy = 0; this.scroll = 0; this.running = false;
      this.layoutMode = 'wide';
      this.build();
    }
    build() {
      const r = this.r;
      r.cam.fov = 30; r.fog = [12, 30];
      this.world = r.group();
      this.rig = r.group(this.world);
      this.rig.rot = [0.14, -0.52, 0];
      const W = 3.6, D = 1.35, U = 0.36;

      /* rack posts */
      const posts = new Geo();
      [-1, 1].forEach(s => { posts.box(s * (W / 2 + 0.11), -0.12, D / 2 - 0.05, 0.14, 2.3, 0.08); posts.box(s * (W / 2 + 0.11), -0.12, -D / 2 + 0.05, 0.14, 2.3, 0.08); });
      posts.box(0, 1.04, D / 2 - 0.05, W + 0.36, 0.06, 0.08); posts.box(0, -1.28, D / 2 - 0.05, W + 0.36, 0.06, 0.08);
      r.addMesh(posts, MAT.rail, this.rig);
      const holes = new Geo();
      [-1, 1].forEach(s => { for (let i = 0; i < 18; i++) holes.box(s * (W / 2 + 0.11), -1.15 + i * 0.125, D / 2 + 0.0, 0.03, 0.03, 0.01); });
      r.addMesh(holes, MAT.port, this.rig);

      /* unit 1 — fibre patch panel (1U) */
      const y1 = 0.72;
      const chassis = new Geo(), face = new Geo(), ports = new Geo(), cages = new Geo(), lcs = new Geo(), darkFace = new Geo();
      chassis.box(0, y1, -0.02, W, U, D - 0.04);
      face.box(0, y1, D / 2 - 0.01, W + 0.3, U, 0.03);
      for (let i = 0; i < 24; i++) { const x = -1.45 + i * 0.118 + Math.floor(i / 6) * 0.05; lcs.box(x, y1 + 0.02, D / 2 + 0.018, 0.085, 0.13, 0.03); ports.box(x - 0.019, y1 + 0.02, D / 2 + 0.034, 0.024, 0.06, 0.005); ports.box(x + 0.019, y1 + 0.02, D / 2 + 0.034, 0.024, 0.06, 0.005); }
      /* unit 2 — 24-port switch with 4 SFP+ cages (1U) */
      const y2 = 0.3;
      chassis.box(0, y2, -0.02, W, U, D - 0.04);
      darkFace.box(0, y2, D / 2 - 0.01, W + 0.3, U, 0.03);
      this.portPos = [];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
        const x = -1.55 + i * 0.165 + Math.floor(i / 6) * 0.08, y = y2 + 0.075 - row * 0.15;
        cages.box(x, y, D / 2 + 0.012, 0.135, 0.115, 0.022);
        ports.box(x, y - 0.005, D / 2 + 0.025, 0.105, 0.08, 0.006);
        this.portPos.push([x - 0.04, y + 0.052, D / 2 + 0.03]);
      }
      this.sfpPos = [];
      for (let i = 0; i < 4; i++) { const x = 0.9 + i * 0.17, y = y2 + 0.03; cages.box(x, y, D / 2 + 0.012, 0.145, 0.07, 0.03); ports.box(x, y, D / 2 + 0.03, 0.11, 0.04, 0.006); this.sfpPos.push([x, y, D / 2 + 0.04]); }
      /* status block */
      ports.box(1.62, y2 + 0.06, D / 2 + 0.02, 0.06, 0.18, 0.006);
      /* unit 3 — 2U fibre chassis */
      const y3 = -0.36, H2 = U * 2;
      chassis.box(0, y3, -0.02, W, H2, D - 0.04);
      face.box(0, y3, D / 2 - 0.01, W + 0.3, H2, 0.03);
      for (let i = 0; i < 14; i++) ports.box(-1.62 + i * 0.05, y3, D / 2 + 0.02, 0.018, 0.5, 0.004); // vents
      for (let b = 0; b < 2; b++) {
        const bx = -0.55 + b * 1.12;
        darkFace.box(bx, y3, D / 2 + 0.01, 1.0, 0.56, 0.02);
        for (let i = 0; i < 8; i++) { const x = bx - 0.38 + i * 0.108; cages.box(x, y3 + 0.1, D / 2 + 0.03, 0.09, 0.06, 0.02); ports.box(x, y3 + 0.1, D / 2 + 0.042, 0.07, 0.035, 0.004); this.sfpPos.push([x, y3 + 0.1, D / 2 + 0.05]); }
      }
      const scr = new Geo(); scr.box(1.45, y3 + 0.08, D / 2 + 0.015, 0.42, 0.16, 0.01);
      r.addMesh(chassis, MAT.chassis, this.rig);
      r.addMesh(face, MAT.face, this.rig);
      r.addMesh(darkFace, MAT.faceDark, this.rig);
      r.addMesh(cages, MAT.cage, this.rig);
      r.addMesh(ports, MAT.port, this.rig);
      r.addMesh(lcs, MAT.lc, this.rig);
      r.addMesh(scr, MAT.screen, this.rig);

      /* edges for crispness */
      const edges = new LineGeo(), ec = rgba('#9fd8ff', 0.22);
      [[y1, U], [y2, U], [y3, H2]].forEach(([y, h]) => edges.boxEdges(0, y, D / 2 + 0.006, W + 0.3, h, 0.03, ec));
      r.addLines(edges, { additive: true }, this.rig);

      /* glass platform */
      const plat = new Geo(); plat.cyl(0, -1.42, 0, 2.9, 0.05, 72, 'y');
      r.addMesh(plat, MAT.glass, this.rig);
      const ring = new LineGeo(); ring.circle(0, -1.39, 0, 2.9, 96, rgba('#4cc9ff', 0.55)); ring.circle(0, -1.39, 0, 2.2, 80, rgba('#4cc9ff', 0.12)); ring.circle(0, -1.39, 0, 1.5, 64, rgba('#4cc9ff', 0.08));
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ring.seg([Math.cos(a) * 1.5, -1.39, Math.sin(a) * 1.5], [Math.cos(a) * 2.9, -1.39, Math.sin(a) * 2.9], rgba('#4cc9ff', 0.05)); }
      this.ringLines = r.addLines(ring, { additive: true }, this.rig);

      /* fibre runs from SFP ports to floating nodes */
      this.nodes = [];
      const nodeSpots = [[-3.6, 1.6, 0.6], [-3.1, -0.9, 1.4], [3.7, 1.9, 0.2], [3.4, -0.5, 1.6], [-0.6, 2.35, -1.2], [1.4, -1.9, 2.1]];
      const nodeG = new Geo();
      this.cables = [];
      const fib = new Geo();
      const sfps = [this.sfpPos[0], this.sfpPos[1], this.sfpPos[2], this.sfpPos[3], this.sfpPos[6], this.sfpPos[12]];
      nodeSpots.forEach((n, i) => {
        nodeG.sphere(n[0], n[1], n[2], 0.11, 14);
        const s = sfps[i];
        const out = [s[0], s[1], s[2] + 0.55];
        const mid = [n[0] * 0.6 + s[0] * 0.4, (n[1] + s[1]) / 2 + 0.25, n[2] + 0.9];
        const pts = bezier(s, out, mid, n, 48);
        fib.tube(pts, 0.016, 6);
        this.cables.push(pts);
        this.nodes.push(n);
      });
      /* patch cords from the patch panel */
      for (let i = 0; i < 4; i++) {
        const x = -1.45 + (i * 2 + 1) * 0.118 + Math.floor((i * 2 + 1) / 6) * 0.05;
        const s = [x, y1 + 0.02, D / 2 + 0.05];
        const e = [-W / 2 - 0.22 - i * 0.03, y1 - 1.6 - i * 0.05, D / 2 + 0.12];
        const pts = bezier(s, [x, y1 - 0.08, D / 2 + 0.32], [-W / 2 + 0.2, y1 - 0.22 - i * 0.02, D / 2 + 0.36], e, 32);
        fib.tube(pts, 0.012, 5);
        if (i % 2 === 0) this.cables.push(pts.slice().reverse());
      }
      r.addMesh(fib, MAT.fibre, this.rig);
      r.addMesh(nodeG, MAT.node, this.rig);

      /* sector antenna */
      const ant = new Geo();
      const AX = 1.5, AZ = -2.7;
      ant.cyl(AX, 0.2, AZ, 0.035, 3.9, 12, 'y');
      ant.box(AX, 1.75, AZ + 0.15, 0.34, 1.05, 0.12);
      ant.box(AX, 1.4, AZ + 0.05, 0.18, 0.06, 0.12); ant.box(AX, 2.15, AZ + 0.05, 0.18, 0.06, 0.12);
      ant.box(AX, 0.9, AZ + 0.05, 0.3, 0.14, 0.2);
      r.addMesh(ant, MAT.radome, this.rig);
      this.antOrigin = [AX, 1.75, AZ + 0.3];
      this.waves = [];
      for (let i = 0; i < 4; i++) {
        const lg = new LineGeo(); const pts = [];
        for (let k = 0; k <= 40; k++) { const a = -0.9 + k / 40 * 1.8; pts.push([Math.sin(a), Math.cos(a) * 0.55, Math.cos(a)]); }
        lg.poly(pts, rgba('#4cc9ff', 1));
        const g = r.group(this.rig); g.pos = this.antOrigin.slice();
        const it = r.addLines(lg, { additive: true, opacity: 0 }, g);
        this.waves.push({ g, it, off: i / 4 });
      }

      /* PCB with traces */
      const pcbG = r.group(this.rig); pcbG.pos = [-3.25, -0.2, -1.9]; pcbG.rot = [0.2, 0.75, -0.08];
      const pcb = new Geo(); pcb.box(0, 0, 0, 2.0, 1.3, 0.04);
      const chips = new Geo(); chips.box(-0.35, 0.15, 0.04, 0.42, 0.42, 0.05); chips.box(0.45, -0.25, 0.04, 0.3, 0.2, 0.04); chips.box(0.5, 0.32, 0.04, 0.22, 0.22, 0.04); chips.box(-0.65, -0.38, 0.04, 0.4, 0.14, 0.03);
      r.addMesh(pcb, MAT.pcb, pcbG); r.addMesh(chips, MAT.chip, pcbG);
      const tr = new LineGeo();
      for (let i = 0; i < 26; i++) {
        let x = -0.95 + rnd() * 1.9, y = -0.6 + rnd() * 1.2; const pts = [[x, y, 0.025]];
        for (let k = 0; k < 3; k++) { if (k % 2 === 0) x = clamp(x + (rnd() - 0.5) * 0.9, -0.95, 0.95); else y = clamp(y + (rnd() - 0.5) * 0.7, -0.6, 0.6); pts.push([x, y, 0.025]); }
        tr.poly(pts, rgba('#a9c6e6', 0.28));
      }
      r.addLines(tr, { additive: true }, pcbG);

      /* LEDs, pulses, particles */
      const nLed = this.portPos.length + 4 + 2 + 8;
      this.leds = r.addPoints(nLed, this.rig, { dof: false, scaleMul: 0.55, bias: 0.001 });
      this.ledState = [];
      let k = 0;
      const putLed = (p, col, size) => { this.leds.pos.set(p, k * 3); this.leds.size[k] = size; this.leds.col.set(col, k * 4); this.ledState.push({ base: col.slice(), link: rnd() < 0.78, ph: rnd() * 10, rate: 2 + rnd() * 9 }); k++; };
      this.portPos.forEach(p => putLed(p, rgba('#3fe0a0', 1), 16));
      this.sfpPos.slice(0, 4).forEach(p => putLed([p[0], p[1] + 0.06, p[2]], rgba('#4cc9ff', 1), 16));
      putLed([1.62, y2 + 0.11, D / 2 + 0.03], rgba('#3fe0a0', 1), 18); putLed([1.62, y2 + 0.03, D / 2 + 0.03], rgba('#ffb648', 1), 18);
      for (let i = 0; i < 8; i++) putLed([-1.62 + i * 0.05 + 0.6, y3 - 0.29, D / 2 + 0.03], rgba(i < 6 ? '#4cc9ff' : '#3fe0a0', 1), 13);

      const nP = this.lite ? 8 : 14;
      this.pulses = r.addPoints(nP * 3 + this.nodes.length, this.rig, { dof: false, bias: 0.004 });
      this.pulseState = [];
      for (let i = 0; i < nP; i++) this.pulseState.push({ c: i % this.cables.length, t: rnd(), v: 0.18 + rnd() * 0.22 });

      const nDust = this.lite ? 160 : 520;
      this.dust = r.addPoints(nDust, this.world);
      for (let i = 0; i < nDust; i++) {
        this.dust.pos.set([(rnd() - 0.5) * 22, (rnd() - 0.5) * 11, -14 + rnd() * 20], i * 3);
        this.dust.size[i] = 4 + rnd() * 10;
        const cool = rnd();
        this.dust.col.set([0.55 + cool * 0.2, 0.75 + cool * 0.15, 1.0, 0.07 + rnd() * 0.22], i * 4);
      }

      /* far topology */
      const topo = new LineGeo(); const tn = [];
      const nT = this.lite ? 18 : 34;
      for (let i = 0; i < nT; i++) tn.push([(rnd() - 0.5) * 26, (rnd() - 0.4) * 12, -10 - rnd() * 8]);
      tn.forEach((a, i) => { const near = tn.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])]).filter(x => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 2); near.forEach(([j]) => topo.seg(a, tn[j], rgba('#4c8dff', 0.16))); });
      r.addLines(topo, { additive: true }, this.world);
      this.topoNodes = r.addPoints(nT, this.world, { dof: true });
      tn.forEach((p, i) => { this.topoNodes.pos.set(p, i * 3); this.topoNodes.size[i] = 16; this.topoNodes.col.set([0.4, 0.7, 1.0, 0.5], i * 4); });
      this.rig.update();
    }
    layout(w, h) {
      const a = w / h;
      if (a >= 1.15) { this.layoutMode = 'wide'; this.base = { x: 1.0 + Math.min(1.5, (a - 1.15) * 1.7), y: 0.05, s: a > 2.2 ? 0.8 : 0.7 }; }
      else { this.layoutMode = 'tall'; this.base = { x: 0.2, y: 1.45, s: a < 0.62 ? 0.34 : 0.5 }; }
    }
    pointer(x, y) { this.tmx = x; this.tmy = y; }
    setScroll(p) { this.scroll = clamp(p, 0, 1); }
    frame(dt) {
      const r = this.r; this.t += dt;
      if (!this.base) this.layout(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1);
      this.mx += (this.tmx - this.mx) * Math.min(1, dt * 3.2); this.my += (this.tmy - this.my) * Math.min(1, dt * 3.2);
      const t = this.t, sp = ease(this.scroll), b = this.base;
      this.rig.pos = [b.x, b.y + sp * 1.4, sp * -1.2];
      this.rig.scale = b.s;
      this.rig.rot = [0.14 + this.my * 0.09 + sp * 0.28 + Math.sin(t * 0.21) * 0.015, -0.52 + this.mx * 0.3 + Math.sin(t * 0.17) * 0.05, Math.sin(t * 0.13) * 0.01];
      r.cam.pos = [this.mx * -0.45, 1.05 - this.my * 0.25 + sp * 0.6, 10.2 + sp * 1.6];
      r.cam.target = [this.mx * -0.1, 0.0 + sp * 0.4, 0];
      r.focus = 10.4; r.dof = this.lite ? 0.06 : 0.11;

      /* LEDs */
      const L = this.leds;
      for (let i = 0; i < this.ledState.length; i++) {
        const s = this.ledState[i];
        let a = s.link ? 0.85 : 0.08;
        if (s.link && Math.sin(t * s.rate + s.ph) > 0.55 && Math.sin(t * 1.7 + s.ph * 3) > -0.2) a = 0.25;
        L.col[i * 4 + 3] = a;
      }
      L.dirty = true;
      /* pulses along fibre */
      const P = this.pulses; let k = 0;
      for (const s of this.pulseState) {
        s.t += dt * s.v; if (s.t > 1.15) { s.t = 0; s.c = Math.floor(rnd() * this.cables.length); }
        const path = this.cables[s.c];
        for (let j = 0; j < 3; j++) {
          const tt = s.t - j * 0.025; const p = samplePath(path, tt);
          P.pos.set(p, k * 3); P.size[k] = j === 0 ? 14 : 10 - j * 2.5;
          const vis = tt >= 0 && tt <= 1 ? 1 : 0;
          P.col.set([0.6, 0.92, 1.0, vis * (j === 0 ? 0.95 : 0.5 - j * 0.15)], k * 4); k++;
        }
      }
      this.nodes.forEach((n, i) => { P.pos.set(n, k * 3); P.size[k] = 26 + Math.sin(t * 1.6 + i) * 5; P.col.set([0.35, 0.8, 1.0, 0.55], k * 4); k++; });
      P.dirty = true;
      /* antenna waves */
      this.waves.forEach(w => { const ph = ((t * 0.38 + w.off) % 1); w.g.scale = 0.2 + ph * 3.2; w.it.opacity = (1 - ph) * 0.42 * Math.min(1, ph * 6); });
      /* dust drift */
      this.world.rot = [0, Math.sin(t * 0.05) * 0.04, 0];
      this.ringLines.opacity = 0.75 + Math.sin(t * 1.3) * 0.25;
      r.render();
    }
    start() {
      if (this.running) return; this.running = true; let last = performance.now();
      const loop = (now) => { if (!this.running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt); this.onFrame && this.onFrame(dt); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    degrade() { this.r.dprCap = 1; this.dust.n = Math.min(this.dust.n, 120); }
    dispose() { this.stop(); this.r.dispose(); }
  }

  /* ===================================================================== */
  class InfraScene {
    constructor(canvas, opts) {
      this.lite = !!opts.lite; this.canvas = canvas;
      this.r = new Renderer(canvas, { antialias: !this.lite, dpr: this.lite ? 1.25 : 1.6, lowPower: this.lite });
      this.p = 0; this.tp = 0; this.t = 0; this.running = false; this.anchors = {};
      this.build();
    }
    build() {
      const r = this.r; r.cam.fov = 34; r.fog = [16, 40]; r.dof = 0.0;
      this.root = r.group();
      /* floor grid */
      const grid = new LineGeo();
      for (let i = -12; i <= 12; i++) {
        const a = 0.05 + (1 - Math.abs(i) / 12) * 0.09;
        grid.seg([i, 0, -7], [i, 0, 7], rgba('#6fa8ff', a)); if (Math.abs(i) <= 7) grid.seg([-12, 0, i], [12, 0, i], rgba('#6fa8ff', a));
      }
      r.addLines(grid, { additive: true }, this.root);
      /* building section: floor slab + back wall + ceiling frame */
      const slab = new Geo(); slab.box(1, -0.06, 0, 13, 0.12, 8);
      r.addMesh(slab, { color: hex('#0b1018'), metal: 0.3, rough: 0.7 }, this.root);
      const frame = new LineGeo(), fc = rgba('#9fd8ff', 0.16);
      frame.boxEdges(1, 1.6, 0, 13, 3.2, 8, fc);
      for (let x = -5; x <= 7; x += 2) frame.seg([x, 3.2, -4], [x, 3.2, 4], rgba('#9fd8ff', 0.06));
      r.addLines(frame, { additive: true }, this.root);
      const wall = new Geo(); wall.box(1, 1.6, -4, 13, 3.2, 0.04);
      r.addMesh(wall, { color: hex('#6fa8ff'), metal: 0, rough: 0.1, opacity: 0.05, transparent: true }, this.root);

      const stage = (i) => { const g = r.group(this.root); g.stage = i; g.scale = 0; return g; };
      this.stages = [stage(0), stage(1), stage(2), stage(3)];
      const [S0, S1, S2, S3] = this.stages;

      /* stage 0 — fibre entry + ONU / media converter */
      const street = [[-12, 0.05, 2.6], [-8, 0.05, 2.6], [-6.2, 0.05, 2.6], [-5.6, 0.25, 2.2], [-5.2, 0.55, 1.6], [-4.75, 0.62, 1.2]];
      const fib0 = new Geo(); fib0.tube(street, 0.045, 8);
      r.addMesh(fib0, MAT.fibre, this.root);
      this.addRun(street, S0, '#4cc9ff', 0);
      const onu = new Geo(); onu.box(-4.4, 0.62, 1.2, 0.7, 0.16, 0.5); onu.box(-4.4, 0.27, 1.2, 0.5, 0.54, 0.04);
      S0.pos = [0, 0, 0];
      r.addMesh(onu, { color: hex('#dfe5ec'), metal: 0.1, rough: 0.45 }, S0);
      const e0 = new LineGeo(); e0.boxEdges(-4.4, 0.62, 1.2, 0.7, 0.16, 0.5, rgba('#4cc9ff', 0.6));
      r.addLines(e0, { additive: true }, S0);
      this.anchors.fibre = [-4.4, 0.95, 1.2];

      /* stage 1 — rack with switching */
      const rack = new Geo(); rack.box(-2.4, 1.1, -2.8, 1.0, 2.2, 0.9);
      r.addMesh(rack, { color: hex('#11161e'), metal: 0.8, rough: 0.4 }, S1);
      const ru = new Geo(); for (let i = 0; i < 7; i++) ru.box(-2.4, 0.35 + i * 0.26, -2.33, 0.86, 0.18, 0.02);
      r.addMesh(ru, MAT.face, S1);
      const e1 = new LineGeo(); e1.boxEdges(-2.4, 1.1, -2.8, 1.0, 2.2, 0.9, rgba('#4cc9ff', 0.55));
      r.addLines(e1, { additive: true }, S1);
      this.rackLeds = r.addPoints(42, S1, { dof: false, bias: 0.001, scaleMul: 0.6 });
      for (let i = 0; i < 42; i++) { const row = Math.floor(i / 6), c = i % 6; this.rackLeds.pos.set([-2.72 + c * 0.11, 0.42 + row * 0.26, -2.31], i * 3); this.rackLeds.size[i] = 12; this.rackLeds.col.set(rgba(c > 3 ? '#4cc9ff' : '#3fe0a0', 0.9), i * 4); }
      this.anchors.switching = [-2.4, 2.45, -2.8];
      /* uplink ONU -> rack */
      this.cableSets = [];
      const up = [[-4.4, 0.62, 0.95], [-4.4, 0.02, 0.6], [-4.4, 0.02, -1.6], [-2.9, 0.02, -2.2], [-2.6, 0.4, -2.33]];
      this.addRun(up, S1, '#4cc9ff', 1);

      /* stage 2 — ceiling access points with coverage */
      this.aps = [[-0.2, 3.05, -0.8], [3.0, 3.05, 1.4], [5.6, 3.05, -1.6]];
      const apG = new Geo(); this.aps.forEach(a => apG.cyl(a[0], a[1], a[2], 0.3, 0.07, 32, 'y'));
      r.addMesh(apG, { color: hex('#e8edf3'), metal: 0.05, rough: 0.35 }, S2);
      this.apWaves = [];
      this.aps.forEach((a, i) => {
        for (let k = 0; k < 3; k++) { const lg = new LineGeo(); lg.circle(0, 0, 0, 1, 64, rgba('#4cc9ff', 1)); const g = r.group(S2); g.pos = [a[0], a[1] - 0.12, a[2]]; const it = r.addLines(lg, { additive: true, opacity: 0 }, g); this.apWaves.push({ g, it, off: k / 3 + i * 0.11 }); }
        this.addRun([[-2.0, 2.2, -2.8], [-2.0, 3.15, -2.8], [a[0], 3.15, -2.8], [a[0], 3.15, a[2]]], S2, '#4cc9ff', 2);
      });
      this.anchors.wireless = [3.0, 3.5, 1.4];

      /* stage 3 — endpoints: desks, cameras, TV/IPTV */
      const desk = new Geo(), scr = new Geo();
      [[1.6, -1.4], [3.2, -1.4], [4.8, -1.4], [1.6, 0.6], [3.2, 0.6], [4.8, 0.6]].forEach(([x, z]) => { desk.box(x, 0.38, z, 1.2, 0.05, 0.7); desk.box(x - 0.55, 0.19, z, 0.04, 0.38, 0.6); desk.box(x + 0.55, 0.19, z, 0.04, 0.38, 0.6); scr.box(x, 0.66, z - 0.2, 0.62, 0.36, 0.03); });
      r.addMesh(desk, { color: hex('#1b222c'), metal: 0.4, rough: 0.5 }, S3);
      this.screens = r.addMesh(scr, { color: hex('#06121c'), metal: 0, rough: 0.2, emis: [0.0, 0.0, 0.0] }, S3);
      const cam = new Geo(); [[7.2, 2.9, -3.7], [-5.2, 2.9, 3.6]].forEach(c => { cam.cyl(c[0], c[1], c[2], 0.11, 0.38, 16, 'x'); cam.box(c[0] + (c[0] > 0 ? 0.2 : -0.2), c[1] + 0.12, c[2], 0.08, 0.2, 0.08); });
      r.addMesh(cam, { color: hex('#e8edf3'), metal: 0.1, rough: 0.4 }, S3);
      const cone = new LineGeo();
      [[7.2, 2.9, -3.7, -1], [-5.2, 2.9, 3.6, 1]].forEach(([x, y, z, s]) => { const tip = [x, y, z]; const a = [x + s * 3.2, 0.02, z + s * -1.8 * (s > 0 ? -1 : 1)]; const b = [x + s * 4.4, 0.02, z + (s > 0 ? -3.2 : 0.8)]; cone.seg(tip, a, rgba('#ffb648', 0.35)); cone.seg(tip, b, rgba('#ffb648', 0.35)); cone.seg(a, b, rgba('#ffb648', 0.2)); });
      r.addLines(cone, { additive: true }, S3);
      const tv = new Geo(); tv.box(6.6, 1.6, -3.9, 1.8, 1.0, 0.05); tv.box(6.6, 0.9, -3.75, 0.4, 0.06, 0.25);
      this.tv = r.addMesh(tv, { color: hex('#06121c'), metal: 0.2, rough: 0.25, emis: [0, 0, 0] }, S3);
      this.addRun([[-2.0, 0.5, -2.8], [-2.0, 0.02, -2.8], [-2.0, 0.02, -1.6], [4.8, 0.02, -1.6], [4.8, 0.4, -1.4]], S3, '#3fe0a0', 3);
      this.addRun([[-2.0, 0.6, -2.8], [-2.0, 0.02, 0.4], [4.8, 0.02, 0.4], [4.8, 0.4, 0.6]], S3, '#3fe0a0', 3);
      this.addRun([[-4.4, 0.4, 1.45], [-4.4, 0.02, 3.2], [7.0, 0.02, 3.2], [7.0, 0.02, -3.8], [6.6, 0.9, -3.8]], S3, '#ffb648', 3);
      this.addRun([[-2.0, 2.0, -2.8], [-2.0, 3.15, -3.6], [7.2, 3.15, -3.6], [7.2, 2.95, -3.7]], S3, '#ffb648', 3);
      this.anchors.endpoints = [3.2, 1.25, -1.4];

      /* pulses */
      this.pulses = r.addPoints(this.lite ? 30 : 60, this.root, { dof: false, bias: 0.002, scaleMul: 0.8 });
      this.pState = [];
      for (let i = 0; i < this.pulses.n; i++) this.pState.push({ run: i % this.runs.length, t: rnd(), v: 0.22 + rnd() * 0.3 });
    }
    addRun(pts, group, col, stage) {
      /* subdivide manhattan path for even pulses + draw-on */
      const dense = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 6)); for (let k = 0; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[2] + (b[2] - a[2]) * k / n]); }
      dense.push(pts[pts.length - 1]);
      const lg = new LineGeo(); lg.poly(dense, rgba(col, 0.5));
      const it = this.r.addLines(lg, { additive: true, draw: 0 }, this.root);
      this.runs = this.runs || []; this.runs.push({ pts: dense, it, stage, col: raw(col) });
    }
    layout() { }
    setProgress(p) { this.tp = clamp(p, 0, 1); }
    camAt(p) {
      const K = [
        [0.00, [-10.2, 2.8, 8.8], [-4.0, 0.7, 0.8]],
        [0.22, [-6.8, 3.0, 6.8], [-3.0, 1.0, -1.2]],
        [0.48, [-5.0, 5.0, 10.2], [0.8, 2.0, -1.0]],
        [0.74, [4.2, 6.8, 11.4], [2.2, 1.0, -0.8]],
        [1.00, [9.6, 10.6, 14.2], [1.2, 0.6, -0.2]]
      ];
      let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
      const a = K[i], b = K[i + 1], k = ease(clamp((p - a[0]) / (b[0] - a[0]), 0, 1));
      const L = (u, v) => u.map((x, j) => x + (v[j] - x) * k);
      return [L(a[1], b[1]), L(a[2], b[2])];
    }
    frame(dt) {
      const r = this.r; this.t += dt;
      this.p += (this.tp - this.p) * Math.min(1, dt * 4);
      const p = this.p, t = this.t;
      const [cp, ct] = this.camAt(p);
      r.cam.pos = [cp[0] + Math.sin(t * 0.3) * 0.08, cp[1], cp[2]]; r.cam.target = ct;
      const starts = [0.0, 0.2, 0.44, 0.68];
      this.stageK = starts.map(s => clamp((p - s + 0.04) / 0.12, 0, 1));
      this.stages.forEach((g, i) => { const k = this.stageK[i]; g.scale = k <= 0 ? 0 : (k >= 1 ? 1 : Math.max(0.0001, easeOutBack(k))); });
      this.runs.forEach(run => { run.it.draw = clamp((p - starts[run.stage] - 0.02) / 0.14, 0, 1); if (run.stage === 0) run.it.draw = 1; });
      /* screens + tv light up */
      const k3 = this.stageK[3];
      this.screens.mat.emis = [0.02 * k3, 0.16 * k3, 0.26 * k3];
      this.tv.mat.emis = [0.02 * k3, 0.05 * k3, 0.09 * k3];
      /* ap waves */
      this.apWaves.forEach(w => { const ph = ((t * 0.32 + w.off) % 1); w.g.scale = 0.2 + ph * 2.6; w.it.opacity = (1 - ph) * 0.5 * this.stageK[2] * Math.min(1, ph * 5); });
      /* rack leds */
      for (let i = 0; i < 42; i++) this.rackLeds.col[i * 4 + 3] = Math.sin(t * (3 + (i % 5)) + i) > 0.3 ? 0.9 : 0.25;
      this.rackLeds.dirty = true;
      /* pulses */
      const P = this.pulses;
      this.pState.forEach((s, i) => {
        const run = this.runs[s.run]; s.t += dt * s.v;
        if (s.t > 1) { s.t = 0; s.run = Math.floor(rnd() * this.runs.length); }
        const vis = run.it.draw >= 0.999 ? 1 : 0;
        P.pos.set(samplePath(run.pts, s.t), i * 3); P.size[i] = 14;
        P.col.set([run.col[0] * 0.6 + 0.4, run.col[1] * 0.6 + 0.4, run.col[2] * 0.6 + 0.4, vis * 0.9], i * 4);
      });
      P.dirty = true;
      r.render();
      if (this.onFrame) this.onFrame();
    }
    screen(name) { const a = this.anchors[name]; return a ? this.r.project(a) : null; }
    start() {
      if (this.running) return; this.running = true; let last = performance.now();
      const loop = (now) => { if (!this.running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; this.frame(dt); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    dispose() { this.stop(); this.r.dispose(); }
  }

  global.RNScenes = { HeroScene, InfraScene };
})(window);
