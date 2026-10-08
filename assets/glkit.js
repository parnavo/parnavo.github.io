/* glkit — a small WebGL1 renderer written for the R. N. Electronics site.
   Meshes (metal / glass / emissive), lines and soft point sprites with a
   depth-of-field falloff. No dependencies. */
(function (global) {
  'use strict';

  /* ---------- math ---------- */
  const M4 = {
    create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul(o, a, b) {
      const r = M4._t;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
      o.set(r); return o;
    },
    persp(o, fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2); o.fill(0);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
    },
    lookAt(o, e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
      let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
      l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
      o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
      o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
      o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
      o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
      o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1; return o;
    },
    /* T * Ry * Rx * Rz * S */
    compose(o, p, r, s) {
      const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
      // R = Ry*Rx*Rz
      const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx;
      const m10 = cx * sz, m11 = cx * cz, m12 = -sx;
      const m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
      o[0] = m00 * s; o[1] = m10 * s; o[2] = m20 * s; o[3] = 0;
      o[4] = m01 * s; o[5] = m11 * s; o[6] = m21 * s; o[7] = 0;
      o[8] = m02 * s; o[9] = m12 * s; o[10] = m22 * s; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o;
    },
    xform(m, v) { // point
      return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
    },
    _t: new Float32Array(16)
  };

  const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(c => Math.pow(c, 2.2)); };

  /* ---------- geometry ---------- */
  class Geo {
    constructor() { this.p = []; this.n = []; }
    tri(a, b, c, n) { this.p.push(...a, ...b, ...c); this.n.push(...n, ...n, ...n); return this; }
    quad(a, b, c, d, n) { return this.tri(a, b, c, n).tri(a, c, d, n); }
    box(cx, cy, cz, w, h, d) {
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
      this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
      return this;
    }
    /* cylinder along an axis ('x','y','z') */
    cyl(cx, cy, cz, r, h, seg, axis, caps) {
      seg = seg || 24; axis = axis || 'y';
      const P = (a, y) => { const c = Math.cos(a) * r, s = Math.sin(a) * r; return axis === 'y' ? [cx + c, cy + y, cz + s] : axis === 'x' ? [cx + y, cy + c, cz + s] : [cx + c, cy + s, cz + y]; };
      const N = (a) => { const c = Math.cos(a), s = Math.sin(a); return axis === 'y' ? [c, 0, s] : axis === 'x' ? [0, c, s] : [c, s, 0]; };
      const up = axis === 'y' ? [0, 1, 0] : axis === 'x' ? [1, 0, 0] : [0, 0, 1];
      const dn = up.map(v => -v);
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const b0 = P(a0, -h / 2), b1 = P(a1, -h / 2), t0 = P(a0, h / 2), t1 = P(a1, h / 2);
        const n0 = N(a0), n1 = N(a1);
        this.p.push(...b0, ...t1, ...b1, ...b0, ...t0, ...t1);
        this.n.push(...n0, ...n1, ...n1, ...n0, ...n0, ...n1);
        if (caps !== false) {
          const ct = axis === 'y' ? [cx, cy + h / 2, cz] : axis === 'x' ? [cx + h / 2, cy, cz] : [cx, cy, cz + h / 2];
          const cb = axis === 'y' ? [cx, cy - h / 2, cz] : axis === 'x' ? [cx - h / 2, cy, cz] : [cx, cy, cz - h / 2];
          this.tri(ct, t1, t0, up); this.tri(cb, b0, b1, dn);
        }
      }
      return this;
    }
    sphere(cx, cy, cz, r, seg) {
      seg = seg || 12; const rings = Math.max(4, seg >> 1);
      const pt = (i, j) => { const th = i / rings * Math.PI, ph = j / seg * Math.PI * 2; const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; return [n, [cx + n[0] * r, cy + n[1] * r, cz + n[2] * r]]; };
      for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
        const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
        this.p.push(...a[1], ...c[1], ...b[1], ...a[1], ...d[1], ...c[1]);
        this.n.push(...a[0], ...c[0], ...b[0], ...a[0], ...d[0], ...c[0]);
      }
      return this;
    }
    /* tube through a polyline of points */
    tube(pts, r, radial) {
      radial = radial || 6; const n = pts.length; if (n < 2) return this;
      let prevN = null; const rings = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...t) || 1; t = t.map(v => v / tl);
        let nn = prevN || (Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
        // Gram-Schmidt to keep frames stable
        const d = nn[0] * t[0] + nn[1] * t[1] + nn[2] * t[2]; nn = [nn[0] - d * t[0], nn[1] - d * t[1], nn[2] - d * t[2]];
        const nl = Math.hypot(...nn) || 1; nn = nn.map(v => v / nl); prevN = nn;
        const bb = [t[1] * nn[2] - t[2] * nn[1], t[2] * nn[0] - t[0] * nn[2], t[0] * nn[1] - t[1] * nn[0]];
        const ring = [];
        for (let k = 0; k < radial; k++) {
          const ang = k / radial * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
          const nv = [nn[0] * c + bb[0] * s, nn[1] * c + bb[1] * s, nn[2] * c + bb[2] * s];
          ring.push([nv, [pts[i][0] + nv[0] * r, pts[i][1] + nv[1] * r, pts[i][2] + nv[2] * r]]);
        }
        rings.push(ring);
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
        const a = rings[i][k], b = rings[i + 1][k], c = rings[i + 1][(k + 1) % radial], d = rings[i][(k + 1) % radial];
        this.p.push(...a[1], ...b[1], ...c[1], ...a[1], ...c[1], ...d[1]);
        this.n.push(...a[0], ...b[0], ...c[0], ...a[0], ...c[0], ...d[0]);
      }
      return this;
    }
    count() { return this.p.length / 3; }
  }

  class LineGeo {
    constructor() { this.p = []; this.c = []; }
    seg(a, b, ca, cb) { this.p.push(...a, ...b); this.c.push(...ca, ...(cb || ca)); return this; }
    poly(pts, col, closed) { for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1], col); if (closed) this.seg(pts[pts.length - 1], pts[0], col); return this; }
    boxEdges(cx, cy, cz, w, h, d, col) {
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(e => this.seg(v[e[0]], v[e[1]], col));
      return this;
    }
    circle(cx, cy, cz, r, seg, col, plane) {
      seg = seg || 48; const pts = [];
      for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r; pts.push(plane === 'xy' ? [cx + c, cy + s, cz] : plane === 'yz' ? [cx, cy + c, cz + s] : [cx + c, cy, cz + s]); }
      return this.poly(pts, col);
    }
    count() { return this.p.length / 3; }
  }

  /* curves */
  function bezier(p0, p1, p2, p3, steps) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      out.push([0, 1, 2].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }
    return out;
  }
  function samplePath(pts, t) { // t in 0..1 along polyline by index (pts are evenly parameterised)
    const f = Math.min(Math.max(t, 0), 1) * (pts.length - 1), i = Math.floor(f), k = f - i, a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  /* ---------- shaders ---------- */
  const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const MESH_VS = `attribute vec3 a_pos;attribute vec3 a_nor;uniform mat4 u_model;uniform mat4 u_vp;varying vec3 v_w;varying vec3 v_n;
void main(){vec4 w=u_model*vec4(a_pos,1.0);v_w=w.xyz;v_n=(u_model*vec4(a_nor,0.0)).xyz;gl_Position=u_vp*w;}`;
  const MESH_FS = PREC + `uniform vec3 u_color;uniform float u_metal;uniform float u_rough;uniform float u_opacity;uniform vec3 u_emis;
uniform vec3 u_cam;uniform vec3 u_fogc;uniform vec2 u_fog;uniform vec3 u_l1d;uniform vec3 u_l1c;uniform vec3 u_l2d;uniform vec3 u_l2c;uniform vec3 u_l3d;uniform vec3 u_l3c;
uniform vec3 u_eT;uniform vec3 u_eM;uniform vec3 u_eB;uniform vec3 u_soft;uniform vec3 u_rimc;uniform float u_exp;varying vec3 v_w;varying vec3 v_n;
vec3 env(vec3 r,float ro){float y=r.y;vec3 c=y>0.0?mix(u_eM,u_eT,pow(y,0.6)):mix(u_eM,u_eB,pow(-y,0.6));
float sb=pow(max(dot(r,u_soft),0.0),mix(90.0,4.0,ro));c+=vec3(0.95,0.97,1.0)*sb*1.6*(1.0-ro*0.55);
float sd=pow(max(dot(r,normalize(vec3(-1.0,0.15,0.35))),0.0),mix(70.0,3.0,ro));c+=u_rimc*sd*0.9;return c;}
vec3 lite(vec3 N,vec3 V,vec3 L,vec3 lc,vec3 dif,vec3 F0,float sh){float nl=max(dot(N,L),0.0);vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.0),sh)*(sh+8.0)/25.0;return (dif*nl+F0*sp*nl)*lc;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
void main(){vec3 N=normalize(v_n);if(!gl_FrontFacing)N=-N;vec3 V=normalize(u_cam-v_w);
vec3 F0=mix(vec3(0.04),u_color,u_metal);vec3 dif=u_color*(1.0-u_metal);float sh=mix(260.0,6.0,u_rough);
vec3 col=dif*0.05+lite(N,V,u_l1d,u_l1c,dif,F0,sh)+lite(N,V,u_l2d,u_l2c,dif,F0,sh)+lite(N,V,u_l3d,u_l3c,dif,F0,sh);
float fr=pow(1.0-max(dot(N,V),0.0),5.0);vec3 F=F0+(1.0-F0)*fr*(1.0-u_rough*0.85);col+=env(reflect(-V,N),u_rough)*F;col+=u_emis;
float d=length(u_cam-v_w);float fg=smoothstep(u_fog.x,u_fog.y,d);col=aces(col*u_exp);col=pow(col,vec3(0.4545));col=mix(col,u_fogc,fg);
gl_FragColor=vec4(col,u_opacity*(1.0-fg*0.6));}`;
  const LINE_VS = `attribute vec3 a_pos;attribute vec4 a_col;uniform mat4 u_model;uniform mat4 u_vp;uniform vec3 u_cam;uniform vec2 u_fog;varying vec4 v_c;
void main(){vec4 w=u_model*vec4(a_pos,1.0);float d=length(u_cam-w.xyz);v_c=a_col;v_c.a*=1.0-smoothstep(u_fog.x,u_fog.y,d)*0.85;gl_Position=u_vp*w;}`;
  const LINE_FS = PREC + `uniform float u_opacity;uniform vec3 u_tint;varying vec4 v_c;void main(){gl_FragColor=vec4(v_c.rgb*u_tint,v_c.a*u_opacity);}`;
  const PT_VS = `attribute vec3 a_pos;attribute float a_size;attribute vec4 a_col;uniform mat4 u_model;uniform mat4 u_vp;uniform vec3 u_cam;uniform float u_scale;uniform float u_focus;uniform float u_dof;uniform float u_max;uniform float u_bias;
varying vec4 v_c;varying float v_b;
void main(){vec4 w=u_model*vec4(a_pos,1.0);gl_Position=u_vp*w;gl_Position.z-=u_bias*gl_Position.w;float d=length(u_cam-w.xyz);float b=clamp(abs(d-u_focus)*u_dof,0.0,1.0);
float s=a_size*u_scale/max(d,0.1)*(1.0+b*2.5);gl_PointSize=clamp(s,1.0,u_max);v_c=a_col;v_c.a*=1.0/(1.0+b*b*5.0);v_b=b;}`;
  const PT_FS = PREC + `varying vec4 v_c;varying float v_b;void main(){vec2 c=gl_PointCoord-0.5;float r=length(c)*2.0;if(r>1.0)discard;
float core=1.0-smoothstep(mix(0.15,0.75,v_b),1.0,r);float glow=pow(1.0-r,2.0)*0.6;float a=v_c.a*max(core,glow);gl_FragColor=vec4(v_c.rgb,a);}`;

  function compile(gl, vs, fs) {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {};
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < nu; i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < na; i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
    return { p, u, a };
  }

  /* ---------- scene graph ---------- */
  class Group {
    constructor(parent) { this.pos = [0, 0, 0]; this.rot = [0, 0, 0]; this.scale = 1; this.parent = parent || null; this.local = M4.create(); this.world = M4.create(); this.visible = true; }
    update() { M4.compose(this.local, this.pos, this.rot, this.scale); if (this.parent) M4.mul(this.world, this.parent.world, this.local); else this.world.set(this.local); }
    isVisible() { let g = this; while (g) { if (!g.visible || g.scale <= 0.0001) return false; g = g.parent; } return true; }
  }

  /* ---------- renderer ---------- */
  class Renderer {
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas; this.dprCap = opts.dpr || 1.75;
      const attrs = { antialias: opts.antialias !== false, alpha: true, premultipliedAlpha: true, powerPreference: opts.lowPower ? 'low-power' : 'high-performance', preserveDrawingBuffer: false };
      const gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      if (!gl) throw new Error('WebGL unavailable');
      this.gl = gl;
      this.mesh = compile(gl, MESH_VS, MESH_FS);
      this.line = compile(gl, LINE_VS, LINE_FS);
      this.pts = compile(gl, PT_VS, PT_FS);
      const r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); this.maxPoint = r ? Math.min(r[1], 96) : 48;
      this.vp = M4.create(); this.view = M4.create(); this.proj = M4.create();
      this.groups = []; this.items = [];
      this.cam = { pos: [0, 0, 10], target: [0, 0, 0], fov: 32, near: 0.1, far: 80 };
      this.fog = [14, 34]; this.fogColor = [0.016, 0.024, 0.04]; this.exposure = 1.15;
      this.light = {
        l1d: norm([0.5, 0.9, 0.7]), l1c: [1.15, 1.12, 1.08],
        l2d: norm([-0.9, 0.25, 0.4]), l2c: [0.12, 0.32, 0.55],
        l3d: norm([-0.2, 0.4, -1.0]), l3c: [0.35, 0.55, 0.85],
        eT: [0.34, 0.42, 0.56], eM: [0.07, 0.09, 0.12], eB: [0.01, 0.012, 0.016], soft: norm([0.2, 0.8, 0.55]), rim: [0.25, 0.7, 1.0]
      };
      this.focus = 10; this.dof = 0.09; this.w = 0; this.h = 0;
      this.lost = false;
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    }
    group(parent) { const g = new Group(parent); this.groups.push(g); return g; }
    _buf(data) { const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
    addMesh(geo, mat, group, extra) {
      const it = Object.assign({ kind: 'mesh', group, n: geo.count(), pb: this._buf(new Float32Array(geo.p)), nb: this._buf(new Float32Array(geo.n)), mat: Object.assign({ color: [0.5, 0.5, 0.5], metal: 0, rough: 0.5, emis: [0, 0, 0], opacity: 1, transparent: false }, mat), visible: true }, extra || {});
      this.items.push(it); return it;
    }
    addLines(lg, opts, group) {
      const gl = this.gl;
      const it = Object.assign({ kind: 'line', group, n: lg.count(), pb: this._buf(new Float32Array(lg.p)), cb: this._buf(new Float32Array(lg.c)), opacity: 1, tint: [1, 1, 1], additive: false, visible: true, draw: 1 }, opts || {});
      if (it.dynamic) { it.cdata = new Float32Array(lg.c); gl.bindBuffer(gl.ARRAY_BUFFER, it.cb); gl.bufferData(gl.ARRAY_BUFFER, it.cdata, gl.DYNAMIC_DRAW); }
      this.items.push(it); return it;
    }
    addPoints(count, group, opts) {
      const gl = this.gl;
      const it = Object.assign({ kind: 'pts', group, n: count, pos: new Float32Array(count * 3), size: new Float32Array(count), col: new Float32Array(count * 4), visible: true, scaleMul: 1, dof: true }, opts || {});
      it.pb = gl.createBuffer(); it.sb = gl.createBuffer(); it.cb = gl.createBuffer();
      it.dirty = true; this.items.push(it); return it;
    }
    resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, this.dprCap);
      const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (w !== this.w || h !== this.h) { this.canvas.width = w; this.canvas.height = h; this.w = w; this.h = h; }
      this.dpr = dpr;
    }
    project(p) { // world -> css px
      const m = this.vp; const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return { x: (x / w * 0.5 + 0.5) * this.canvas.clientWidth, y: (1 - (y / w * 0.5 + 0.5)) * this.canvas.clientHeight, behind: w < 0 };
    }
    render() {
      if (this.lost) return;
      const gl = this.gl; this.resize();
      gl.viewport(0, 0, this.w, this.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const c = this.cam;
      M4.persp(this.proj, c.fov * Math.PI / 180, this.w / this.h, c.near, c.far);
      M4.lookAt(this.view, c.pos, c.target, [0, 1, 0]);
      M4.mul(this.vp, this.proj, this.view);
      for (const g of this.groups) g.update(); // groups are created parent-first
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      const opaque = [], lines = [], trans = [], glow = [];
      for (const it of this.items) {
        if (!it.visible || (it.group && !it.group.isVisible())) continue;
        if (it.kind === 'mesh') (it.mat.transparent ? trans : opaque).push(it);
        else if (it.kind === 'line') (it.additive ? glow : lines).push(it);
        else glow.push(it);
      }
      gl.disable(gl.BLEND); gl.depthMask(true);
      this._meshes(opaque);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this._lines(lines);
      gl.depthMask(false);
      this._meshes(trans);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
      for (const it of glow) { if (it.kind === 'line') this._lines([it]); else this._points(it); }
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    _common(prog, it) {
      const gl = this.gl, u = prog.u;
      gl.uniformMatrix4fv(u.u_vp, false, this.vp);
      gl.uniformMatrix4fv(u.u_model, false, it.group ? it.group.world : IDENT);
      if (u.u_cam) gl.uniform3fv(u.u_cam, this.cam.pos);
      if (u.u_fog) gl.uniform2f(u.u_fog, this.fog[0], this.fog[1]);
    }
    _attr(loc, buf, size) { const gl = this.gl; if (loc < 0 || loc === undefined) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
    _meshes(list) {
      if (!list.length) return; const gl = this.gl, P = this.mesh, u = P.u, L = this.light; gl.useProgram(P.p);
      gl.uniform3fv(u.u_fogc, this.fogColor); gl.uniform1f(u.u_exp, this.exposure);
      gl.uniform3fv(u.u_l1d, L.l1d); gl.uniform3fv(u.u_l1c, L.l1c); gl.uniform3fv(u.u_l2d, L.l2d); gl.uniform3fv(u.u_l2c, L.l2c); gl.uniform3fv(u.u_l3d, L.l3d); gl.uniform3fv(u.u_l3c, L.l3c);
      gl.uniform3fv(u.u_eT, L.eT); gl.uniform3fv(u.u_eM, L.eM); gl.uniform3fv(u.u_eB, L.eB); gl.uniform3fv(u.u_soft, L.soft); gl.uniform3fv(u.u_rimc, L.rim);
      for (const it of list) {
        const m = it.mat; this._common(P, it);
        gl.uniform3fv(u.u_color, m.color); gl.uniform1f(u.u_metal, m.metal); gl.uniform1f(u.u_rough, m.rough); gl.uniform3fv(u.u_emis, m.emis); gl.uniform1f(u.u_opacity, m.opacity);
        this._attr(P.a.a_pos, it.pb, 3); this._attr(P.a.a_nor, it.nb, 3);
        gl.drawArrays(gl.TRIANGLES, 0, it.n);
      }
    }
    _lines(list) {
      if (!list.length) return; const gl = this.gl, P = this.line, u = P.u; gl.useProgram(P.p);
      for (const it of list) {
        this._common(P, it); gl.uniform1f(u.u_opacity, it.opacity); gl.uniform3fv(u.u_tint, it.tint);
        this._attr(P.a.a_pos, it.pb, 3);
        if (it.dynamic && it.cdirty) { gl.bindBuffer(gl.ARRAY_BUFFER, it.cb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, it.cdata); it.cdirty = false; }
        this._attr(P.a.a_col, it.cb, 4);
        const n = Math.floor(it.n * Math.min(1, Math.max(0, it.draw)) / 2) * 2;
        if (n > 0) gl.drawArrays(gl.LINES, 0, n);
      }
    }
    _points(it) {
      const gl = this.gl, P = this.pts, u = P.u; gl.useProgram(P.p);
      this._common(P, it);
      gl.uniform1f(u.u_scale, this.h * 0.0042 * it.scaleMul); gl.uniform1f(u.u_bias, it.bias || 0); gl.uniform1f(u.u_focus, this.focus); gl.uniform1f(u.u_dof, it.dof ? this.dof : 0); gl.uniform1f(u.u_max, this.maxPoint);
      if (it.dirty) {
        gl.bindBuffer(gl.ARRAY_BUFFER, it.pb); gl.bufferData(gl.ARRAY_BUFFER, it.pos, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, it.sb); gl.bufferData(gl.ARRAY_BUFFER, it.size, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, it.cb); gl.bufferData(gl.ARRAY_BUFFER, it.col, gl.DYNAMIC_DRAW);
        it.dirty = false;
      }
      this._attr(P.a.a_pos, it.pb, 3); this._attr(P.a.a_size, it.sb, 1); this._attr(P.a.a_col, it.cb, 4);
      gl.drawArrays(gl.POINTS, 0, it.n);
    }
    dispose() { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
  }
  const IDENT = M4.create();
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  function supported() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  }

  global.GLK = { M4, Geo, LineGeo, Renderer, hex, bezier, samplePath, supported, norm };
})(window);
