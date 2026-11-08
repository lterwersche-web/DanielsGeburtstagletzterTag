/* =========================================================
   Für Papa – Tag 8 · Silvester-Animation

   Ablauf:
   Sperre (zu früh) → Start → Einleitung → Fotos → Foto-Wand
   → Fotos zerfallen zum Herz → Countdown → Feuerwerk-Finale

   Texte & Fotos stehen in inhalt.js – hier ist nur die Technik.
   ========================================================= */
(() => {
  "use strict";

  const I = window.INHALT || {};
  const $ = (s) => document.querySelector(s);

  // ---------- kleine Helfer ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const get = (path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), I);

  // Test-Link: ...?test  (überspringt die Sperre)
  // Szene direkt testen: ...?test&szene=fotos | herz | finale
  const params = new URLSearchParams(location.search);
  const TEST = params.has("test");
  const SZENE = params.get("szene") || "";

  // =========================================================
  //  Leinwände (Canvas)
  //  sterne = Hintergrund · funken = Feuerwerk mit Schweif
  //  glanz  = Herz + Feuerwerk-Schrift (gestochen scharf)
  // =========================================================
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const cStars = $("#sterne"), sctx = cStars.getContext("2d");
  const cFx = $("#funken"), fctx = cFx.getContext("2d");
  const cGl = $("#glanz"), gctx = cGl.getContext("2d");
  let W = 0, H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    for (const c of [cStars, cFx, cGl]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    for (const x of [sctx, fctx, gctx]) x.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------- Leuchtpunkte (vorgerendert = schnell) ----------
  const COLORS = {
    gold: [245, 197, 107],
    champ: [255, 227, 163],
    weiss: [255, 246, 229],
    rosegold: [242, 160, 123],
    rose: [255, 150, 165],
    blau: [158, 201, 255],
    amber: [255, 176, 92],
  };
  const SPR = {};
  for (const [name, [r, g, b]] of Object.entries(COLORS)) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.14, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.4, `rgba(${r},${g},${b},0.33)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    SPR[name] = c;
  }
  const PALETTES = [
    ["gold", "champ"], ["gold", "weiss"], ["champ", "weiss"], ["gold", "amber"],
    ["rosegold", "gold"], ["rose", "champ"], ["blau", "weiss"], ["gold", "champ"],
  ];

  // =========================================================
  //  Sternenhimmel
  // =========================================================
  const stars = [];
  const nStars = Math.round(clamp((W * H) / 2300, 120, 420));
  for (let i = 0; i < nStars; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.pow(Math.random(), 2.4) * 1.5 + 0.3,
      ph: rand(0, Math.PI * 2),
      sp: rand(0.4, 1.8),
      warm: Math.random() < 0.28,
    });
  }
  const shooters = [];
  let nextShooter = performance.now() + 2500;
  let starAlpha = 1;

  function drawStars(now, dt) {
    sctx.clearRect(0, 0, W, H);
    const drift = now * 0.0000035;
    for (let pass = 0; pass < 2; pass++) {
      sctx.fillStyle = pass ? "#ffe3a3" : "#fff6e5";
      for (const s of stars) {
        if (s.warm !== !!pass) continue;
        sctx.globalAlpha = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.001 * s.sp + s.ph))) * starAlpha;
        const x = ((s.x + drift * s.r) % 1) * W;
        sctx.beginPath();
        sctx.arc(x, s.y * H, s.r, 0, Math.PI * 2);
        sctx.fill();
      }
    }
    // Sternschnuppen
    if (now > nextShooter) {
      const ang = rand(0.35, 0.6), v = rand(0.7, 1.0);
      shooters.push({ x: rand(0.35, 1.05) * W, y: rand(0.02, 0.32) * H, vx: -Math.cos(ang) * v, vy: Math.sin(ang) * v, age: 0, life: rand(700, 1100) });
      SFX.sternschnuppe(clamp(shooters[shooters.length - 1].x / W, 0, 1));
      nextShooter = now + rand(3500, 9000);
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const m = shooters[i];
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const k = m.age / m.life;
      if (k >= 1) { shooters.splice(i, 1); continue; }
      const a = Math.sin(Math.PI * k) * starAlpha;
      const tx = m.x - m.vx * 120, ty = m.y - m.vy * 120;
      const g = sctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(255,246,229,${a})`);
      g.addColorStop(1, "rgba(255,246,229,0)");
      sctx.globalAlpha = 1;
      sctx.strokeStyle = g;
      sctx.lineWidth = 1.4;
      sctx.lineCap = "round";
      sctx.beginPath();
      sctx.moveTo(m.x, m.y);
      sctx.lineTo(tx, ty);
      sctx.stroke();
    }
    sctx.globalAlpha = 1;
  }

  // =========================================================
  //  Feuerwerk: Funken, Raketen, Explosionen
  // =========================================================
  const sparks = [];
  const rockets = [];
  const tparts = []; // Funken, die Schrift bilden
  let ambientGap = 0; // 0 = kein Hintergrund-Feuerwerk
  let nextAmbient = 0;
  let ambientOben = false; // true = nur oben am Himmel, ohne Raketen

  function addSpark(x, y, vx, vy, o) {
    sparks.push({
      x, y, vx, vy,
      age: 0,
      life: o.life,
      spr: o.spr,
      size: o.size || rand(6, 9),
      drag: o.drag || 0.968,
      g: o.g == null ? 0.00016 : o.g,
      tw: o.tw || 0,
      ph: rand(0, 6.28),
    });
  }

  function heartShape(t) {
    const s = Math.sin(t);
    return {
      x: 16 * s * s * s,
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    };
  }

  function burst(x, y, type = "peony", pal = pick(PALETTES), laut = 1) {
    SFX.knall(clamp(x / W, 0, 1), type === "ring" || type === "herz" ? 0.8 : 1, type === "willow" || Math.random() < 0.3, laut);
    const s1 = SPR[pal[0]], s2 = SPR[pal[1]];
    const big = clamp(Math.min(W, H) / 390, 0.85, 1.9);
    addSpark(x, y, 0, 0, { life: 280, spr: SPR.weiss, size: 70 * big, drag: 1, g: 0 }); // Lichtblitz

    if (type === "ring") {
      const n = 72, sp = rand(0.26, 0.32) * big;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, v = sp * rand(0.96, 1);
        addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, { life: rand(1100, 1500), spr: i % 2 ? s1 : s2 });
      }
    } else if (type === "willow") {
      for (let i = 0; i < 85; i++) {
        const a = rand(0, Math.PI * 2), v = rand(0.06, 0.27) * big;
        addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, {
          life: rand(2000, 2900), spr: Math.random() < 0.6 ? SPR.gold : SPR.amber,
          size: rand(5, 7), drag: 0.955, g: 0.00022, tw: 1,
        });
      }
    } else if (type === "herz") {
      const n = 100, sp = 0.3 * big;
      for (let i = 0; i < n; i++) {
        const h = heartShape((i / n) * Math.PI * 2);
        addSpark(x, y, (h.x / 17) * sp, (-h.y / 17) * sp, {
          life: rand(1300, 1700), spr: i % 3 ? SPR.rose : SPR.rosegold, g: 0.00008,
        });
      }
    } else {
      for (let i = 0; i < 120; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(0.26, 0.36) * big * (Math.random() < 0.75 ? rand(0.82, 1) : rand(0.25, 0.8));
        addSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, {
          life: rand(1000, 1600), spr: Math.random() < 0.5 ? s1 : s2, tw: Math.random() < 0.3 ? 1 : 0,
        });
      }
    }
  }

  function launch(tx, ty, o = {}) {
    return new Promise((res) => {
      const x0 = tx + rand(-0.06, 0.06) * W;
      const T = o.T || rand(950, 1350);
      SFX.rakete(clamp(x0 / W, 0, 1), T / 1000);
      rockets.push({
        x0, y0: H + 12, tx, ty, x: x0, y: H + 12,
        age: 0, T, type: o.type || "peony", noBurst: !!o.noBurst, res,
      });
    });
  }

  function pickType() {
    const r = Math.random();
    return r < 0.45 ? "peony" : r < 0.65 ? "ring" : r < 0.85 ? "willow" : "herz";
  }

  function updateRockets(c, dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.age += dt;
      const k = Math.min(1, r.age / r.T), e = 1 - (1 - k) * (1 - k);
      const px = r.x, py = r.y;
      r.x = lerp(r.x0, r.tx, e) + Math.sin(r.age * 0.02) * 0.8;
      r.y = lerp(r.y0, r.ty, e);
      // Schweif: Funken gleichmäßig zwischen alter und neuer Position verteilen
      const n = clamp(Math.ceil(Math.hypot(r.x - px, r.y - py) / 3), 1, 8);
      for (let j = 0; j < n; j++) {
        const q = (j + Math.random()) / n;
        addSpark(lerp(px, r.x, q) + rand(-0.8, 0.8), lerp(py, r.y, q), rand(-0.012, 0.012), rand(0.01, 0.05), {
          life: rand(300, 600), spr: SPR.amber, size: rand(3, 4.5), drag: 0.94, g: 0.00008,
        });
      }
      c.globalAlpha = 1;
      c.drawImage(SPR.champ, r.x - 6, r.y - 6, 12, 12);
      if (k >= 1) {
        rockets.splice(i, 1);
        if (!r.noBurst) burst(r.tx, r.ty, r.type);
        r.res();
      }
    }
  }

  function updateSparks(c, dt) {
    const f = dt / 16.67;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      if (p.age >= p.life) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
      const dr = Math.pow(p.drag, f);
      p.vx *= dr;
      p.vy *= dr;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / p.life;
      let a = 1 - k * k;
      if (p.tw && k > 0.4) a *= 0.4 + 0.6 * Math.abs(Math.sin(p.age * 0.035 + p.ph));
      c.globalAlpha = a;
      const s = p.size * (0.55 + 0.45 * (1 - k));
      c.drawImage(p.spr, p.x - s / 2, p.y - s / 2, s, s);
    }
  }

  // ---------- Feuerwerk-Schrift ----------
  const FONT = (s) => `700 ${s}px "Cinzel", "Cormorant Garamond", Georgia, serif`;
  const meas = document.createElement("canvas").getContext("2d");

  function textWidth(text, size) {
    meas.font = FONT(size);
    const chars = [...text];
    return chars.reduce((a, ch) => a + meas.measureText(ch).width, 0) + size * 0.07 * (chars.length - 1);
  }
  function fitSize(texts, maxW, maxH) {
    return Math.min(...texts.map((t) => Math.min(maxH, maxH * (maxW / textWidth(t, maxH)))));
  }

  function textPoints(text, cy, size) {
    const w = Math.ceil(W), h = Math.ceil(H);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.font = FONT(size);
    g.fillStyle = g.strokeStyle = "#fff";
    g.lineWidth = Math.max(1, size * 0.035);
    g.lineJoin = "round";
    g.textBaseline = "middle";
    const chars = [...text];
    const spacing = size * 0.07;
    let x = W / 2 - textWidth(text, size) / 2;
    for (const ch of chars) {
      g.fillText(ch, x, cy);
      g.strokeText(ch, x, cy);
      x += g.measureText(ch).width + spacing;
    }
    const d = g.getImageData(0, 0, w, h).data;
    const gap = clamp(size / 24, 2.6, 5.5);
    let pts = [];
    for (let y = 0; y < h; y += gap) {
      for (let xx = 0; xx < w; xx += gap) {
        if (d[((y | 0) * w + (xx | 0)) * 4 + 3] > 120) pts.push({ x: xx + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5) });
      }
    }
    if (pts.length > 1500) pts = shuffle(pts).slice(0, 1500);
    return pts;
  }

  async function textFirework(text, cy, size) {
    const pts = textPoints(text, cy, size);
    await launch(W / 2, cy, { noBurst: true, T: 1100 });
    addSpark(W / 2, cy, 0, 0, { life: 380, spr: SPR.weiss, size: 120, drag: 1, g: 0 });
    SFX.knall(0.5, 0.9, false);
    SFX.schrift();
    const cols = ["champ", "gold", "gold", "weiss"];
    const group = [];
    for (const pt of pts) {
      const a = rand(0, Math.PI * 2), v = rand(0.05, 0.45);
      const p = {
        x: W / 2, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        tx: pt.x, ty: pt.y, age: 0, conv: rand(160, 340), dur: rand(750, 1250),
        mode: 0, spr: SPR[pick(cols)], size: rand(6, 9), ph: rand(0, 6.28), life: 0, max: 1,
      };
      group.push(p);
      tparts.push(p);
    }
    await wait(1700);
    return group;
  }

  function releaseText(group) {
    for (const p of group) {
      p.mode = 3;
      p.vx = rand(-0.05, 0.05);
      p.vy = rand(-0.08, 0);
      p.life = 0;
      p.max = rand(900, 1700);
    }
  }

  function updateTextParts(c, now, dt) {
    for (let i = tparts.length - 1; i >= 0; i--) {
      const p = tparts[i];
      p.age += dt;
      let a = 1;
      if (p.mode === 0) { // Explosion
        const dr = Math.pow(0.93, dt / 16.67);
        p.vx *= dr;
        p.vy *= dr;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.age > p.conv) { p.mode = 1; p.fx = p.x; p.fy = p.y; p.m = 0; }
      } else if (p.mode === 1) { // fliegt zum Buchstaben
        p.m += dt;
        const k = Math.min(1, p.m / p.dur), e = easeInOut(k);
        p.x = lerp(p.fx, p.tx, e);
        p.y = lerp(p.fy, p.ty, e);
        if (k >= 1) p.mode = 2;
      } else if (p.mode === 2) { // steht und funkelt
        p.x = p.tx + Math.sin(now * 0.0021 + p.ph) * 0.45;
        p.y = p.ty + Math.cos(now * 0.0017 + p.ph) * 0.45;
        a = 0.72 + 0.28 * Math.sin(now * 0.005 + p.ph * 3);
        if (Math.random() < 0.0035 * (dt / 16.67)) {
          addSpark(p.x, p.y, rand(-0.02, 0.02), rand(0, 0.03), { life: rand(500, 900), spr: SPR.champ, size: rand(2.5, 4), drag: 0.97, g: 0.0002 });
        }
      } else { // fällt runter
        p.life += dt;
        p.vy += 0.00016 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        a = 1 - p.life / p.max;
        if (a <= 0) { tparts[i] = tparts[tparts.length - 1]; tparts.pop(); continue; }
      }
      c.globalAlpha = a;
      c.drawImage(p.spr, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  // =========================================================
  //  Herz aus Foto-Pixeln
  // =========================================================
  let heart = null;
  const STEPS = 12;
  const HEART_COLORS = [
    [[245, 197, 107], 0.42], [[255, 227, 163], 0.24], [[255, 246, 229], 0.14], [[242, 160, 123], 0.2],
  ];
  function heartColor() {
    let r = Math.random();
    for (const [c, w] of HEART_COLORS) { if ((r -= w) <= 0) return c; }
    return HEART_COLORS[0][0];
  }

  // Herz-Umriss als Vieleck + Länge entlang des Rands (für gleichmäßige Verteilung)
  const HEART_POLY = Array.from({ length: 360 }, (_, i) => heartShape((i / 360) * Math.PI * 2));
  const HEART_LEN = [0];
  for (let i = 1; i <= HEART_POLY.length; i++) {
    const a = HEART_POLY[i - 1], b = HEART_POLY[i % HEART_POLY.length];
    HEART_LEN.push(HEART_LEN[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  function inHeart(x, y) {
    let inside = false;
    for (let i = 0, j = HEART_POLY.length - 1; i < HEART_POLY.length; j = i++) {
      const a = HEART_POLY[i], b = HEART_POLY[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function heartEdgePoint() {
    const L = Math.random() * HEART_LEN[HEART_LEN.length - 1];
    let i = 1;
    while (HEART_LEN[i] < L) i++;
    const k = (L - HEART_LEN[i - 1]) / (HEART_LEN[i] - HEART_LEN[i - 1]);
    const a = HEART_POLY[i - 1], b = HEART_POLY[i % HEART_POLY.length];
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
  }
  function heartTarget(cx, cy, hs) {
    let hx, hy;
    if (Math.random() < 0.3) {
      const e = heartEdgePoint(), k = rand(0.97, 1.02);
      hx = e.x * k;
      hy = e.y * k;
    } else {
      do { hx = rand(-16.5, 16.5); hy = rand(-17, 13); } while (!inHeart(hx, hy));
    }
    return { x: cx + (hx / 17) * hs, y: cy - ((hy + 2.5) / 17) * hs };
  }

  function makeHeartPart(x, y, col, size0, delay, cx, cy, hs) {
    const t = heartTarget(cx, cy, hs);
    const tc = heartColor();
    const cs = [];
    for (let s = 0; s <= STEPS; s++) {
      const k = s / STEPS;
      cs.push(`rgb(${lerp(col[0], tc[0], k) | 0},${lerp(col[1], tc[1], k) | 0},${lerp(col[2], tc[2], k) | 0})`);
    }
    const dx = t.x - x, dy = t.y - y, d = Math.hypot(dx, dy) || 1;
    return {
      sx: x, sy: y, tx: t.x, ty: t.y, nx: -dy / d, ny: dx / d,
      curve: rand(-0.28, 0.28) * d, d: delay, dur: rand(1700, 2600),
      s0: size0, s1: rand(1.6, 2.6), cs, ph: rand(0, 6.28),
    };
  }

  function drawCover(g, img, x, y, w, h) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return;
    const ir = iw / ih, r = w / h;
    let sw, sh, sx, sy;
    if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; }
    else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) / 2; }
    g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function particlesFromCards(cards, L, cx, cy, hs) {
    const parts = [];
    const budget = W * H > 600000 ? 3200 : 2400;
    const per = clamp(Math.floor(budget / cards.length), 90, 900);
    const aspect = L.cardH / L.cardW;
    const gw = Math.max(6, Math.round(Math.sqrt(per / aspect)));
    const gh = Math.max(8, Math.round(gw * aspect));
    const off = document.createElement("canvas");
    off.width = gw;
    off.height = gh;
    const g = off.getContext("2d", { willReadFrequently: true });
    const order = shuffle(cards.map((_, i) => i));

    cards.forEach((card, ci) => {
      g.fillStyle = "#fbf6ea";
      g.fillRect(0, 0, gw, gh);
      const pad = 0.045 * gw, iw = 0.91 * gw, ih = 1.1375 * gw;
      if (card.img) {
        drawCover(g, card.img, pad, pad, iw, ih);
      } else {
        const gr = g.createLinearGradient(pad, pad, pad + iw, pad + ih);
        gr.addColorStop(0, "#1d2552");
        gr.addColorStop(0.55, "#3a2f55");
        gr.addColorStop(1, "#9a7440");
        g.fillStyle = gr;
        g.fillRect(pad, pad, iw, ih);
      }
      let data = null;
      try { data = g.getImageData(0, 0, gw, gh).data; } catch (e) { data = null; }

      const { x: ox, y: oy, r, s } = card.slot;
      const rot = (r * Math.PI) / 180, cos = Math.cos(rot), sin = Math.sin(rot);
      const ccx = W / 2 + ox, ccy = H / 2 + oy;
      const cell = (L.cardW * s) / gw;
      const base = order[ci] * 110;
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const lx = ((i + 0.5) / gw - 0.5) * L.cardW * s;
          const ly = ((j + 0.5) / gh - 0.5) * L.cardH * s;
          const x = ccx + lx * cos - ly * sin;
          const y = ccy + lx * sin + ly * cos;
          const k = (j * gw + i) * 4;
          const col = data ? [data[k], data[k + 1], data[k + 2]] : [245, 197, 107];
          parts.push(makeHeartPart(x, y, col, cell + 0.6, base + rand(0, 900), cx, cy, hs));
        }
      }
    });
    return parts;
  }

  function particlesFromStars(cx, cy, hs) {
    const parts = [];
    const n = W * H > 600000 ? 2600 : 1900;
    for (let i = 0; i < n; i++) {
      parts.push(makeHeartPart(rand(0, W), rand(0, H), [255, 246, 229], 1.4, rand(0, 1500), cx, cy, hs));
    }
    return parts;
  }

  function drawHeart(now, dt) {
    const h = heart;
    const t = now - h.t0;
    h.alpha += (h.alphaT - h.alpha) * Math.min(1, dt / 250);

    if (h.boom) {
      // Herz explodiert – wird auf der Funken-Ebene mit Schweif gemalt
      const c = fctx;
      c.globalCompositeOperation = "lighter";
      const f = dt / 16.67, dr = Math.pow(0.975, f);
      let alive = 0;
      for (const p of h.parts) {
        p.age += dt;
        if (p.age >= p.life) continue;
        alive++;
        p.vx *= dr;
        p.vy *= dr;
        p.vy += 0.00018 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        c.globalAlpha = Math.pow(1 - p.age / p.life, 1.2);
        c.fillStyle = p.col;
        c.fillRect(p.x - 1.1, p.y - 1.1, 2.2, 2.2);
      }
      c.globalAlpha = 1;
      if (!alive) heart = null;
      return;
    }

    const c = gctx;
    if (t > h.formedAt) h.beat = Math.min(1, h.beat + dt / 700);
    const cyc = Math.floor(t / 1150);
    if (cyc !== h.cyc) {
      h.cyc = cyc;
      if (h.beat > 0.05 && !h.still) SFX.herz(0.35 + 0.65 * h.beat, 0.115); // 0.115 s = genau beim sichtbaren Schlag
    }
    const u = (t % 1150) / 1150;
    const pulse = Math.exp(-(((u - 0.1) / 0.055) ** 2)) + 0.55 * Math.exp(-(((u - 0.32) / 0.065) ** 2));
    const kick = now > h.kick ? Math.exp(-(now - h.kick) / 220) : 0;
    const sc = 1 + h.beat * 0.045 * pulse + 0.12 * kick;

    // weiches Leuchten hinter dem Herz
    const ga = (0.1 + 0.12 * pulse * h.beat + 0.3 * kick) * h.alpha * Math.min(1, t / 2500);
    if (ga > 0.005) {
      const gr = c.createRadialGradient(h.cx, h.cy, 0, h.cx, h.cy, h.hs * 1.7);
      gr.addColorStop(0, `rgba(245,197,107,${ga})`);
      gr.addColorStop(1, "rgba(245,197,107,0)");
      c.fillStyle = gr;
      c.fillRect(h.cx - h.hs * 1.7, h.cy - h.hs * 1.7, h.hs * 3.4, h.hs * 3.4);
    }

    c.globalAlpha = h.alpha;
    for (const p of h.parts) {
      const k = clamp((t - p.d) / p.dur, 0, 1), e = easeInOut(k);
      const arc = Math.sin(Math.PI * e) * p.curve;
      let x = p.sx + (p.tx - p.sx) * e + p.nx * arc;
      let y = p.sy + (p.ty - p.sy) * e + p.ny * arc;
      let size = p.s0 + (p.s1 - p.s0) * easeOut(k);
      if (k >= 1) {
        x = h.cx + (x - h.cx) * sc + Math.sin(now * 0.002 + p.ph) * 0.5;
        y = h.cy + (y - h.cy) * sc + Math.cos(now * 0.0023 + p.ph) * 0.5;
        size *= 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(now * 0.004 + p.ph));
      }
      p.x = x;
      p.y = y;
      c.fillStyle = p.cs[(e * STEPS + 0.5) | 0];
      c.fillRect(x - size / 2, y - size / 2, size, size);
    }
    c.globalAlpha = 1;
  }

  function boomHeart() {
    const h = heart;
    if (!h) return;
    for (const p of h.parts) {
      const dx = p.x - h.cx, dy = p.y - h.cy, d = Math.hypot(dx, dy) || 1;
      const a = Math.atan2(dy, dx) + rand(-0.25, 0.25);
      const v = rand(0.15, 0.6) * (0.5 + (0.6 * d) / h.hs);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.age = 0;
      p.life = rand(1100, 2300);
      p.col = p.cs[STEPS];
    }
    h.boom = true;
    gctx.clearRect(0, 0, W, H);
  }

  // =========================================================
  //  Haupt-Schleife (läuft ~60x pro Sekunde)
  // =========================================================
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;

    drawStars(now, dt);

    // Funken-Ebene langsam ausblenden = Schweif-Effekt
    fctx.globalCompositeOperation = "destination-out";
    fctx.globalAlpha = 1 - Math.pow(1 - 0.28, dt / 16.67);
    fctx.fillStyle = "#000";
    fctx.fillRect(0, 0, W, H);
    fctx.globalAlpha = 1;

    gctx.clearRect(0, 0, W, H);
    gctx.globalCompositeOperation = "source-over";
    if (heart) drawHeart(now, dt);

    if (ambientGap && now > nextAmbient) {
      const side = Math.random() < 0.5 ? rand(0.1, 0.38) : rand(0.62, 0.9);
      if (ambientOben) burst(side * W, rand(0.05, 0.17) * H, pickType(), pick(PALETTES), 0.6); // ohne Rakete, damit kein Schweif durch den Text geht
      else launch(side * W, rand(0.1, 0.3) * H, { type: pickType() });
      nextAmbient = now + rand(ambientGap * 0.6, ambientGap * 1.4);
    }

    fctx.globalCompositeOperation = "lighter";
    updateRockets(fctx, dt);
    updateSparks(fctx, dt);
    fctx.globalAlpha = 1;
    fctx.globalCompositeOperation = "source-over";

    gctx.globalCompositeOperation = "lighter";
    updateTextParts(gctx, now, dt);
    gctx.globalCompositeOperation = "source-over";

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // =========================================================
  //  Texte einblenden
  // =========================================================
  const texte = $("#texte");

  function textEl(cls, text) {
    const el = document.createElement("div");
    el.className = cls;
    const span = document.createElement("span");
    span.textContent = text;
    el.append(span);
    return el;
  }

  function addLine(text, { y = 0.5, cls = "" } = {}) {
    SFX.zeile();
    const el = textEl("zeile " + cls, text);
    el.style.top = y * 100 + "%";
    texte.append(el);
    el.animate(
      [
        { opacity: 0, transform: "translate(-50%,-50%) translateY(16px)", filter: "blur(10px)" },
        { opacity: 1, transform: "translate(-50%,-50%)", filter: "blur(0px)" },
      ],
      { duration: 1100, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
    );
    return {
      el,
      hide: (ms = 800) =>
        el.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(8px)" }], { duration: ms, easing: "ease", fill: "forwards" })
          .finished.then(() => el.remove()),
    };
  }

  async function showLine(text, o = {}) {
    if (!text) return;
    const l = addLine(text, o);
    await wait(1100 + (o.hold == null ? 2400 : o.hold));
    await l.hide();
  }

  function appear(el, delay = 0) {
    return el.animate(
      [
        { opacity: 0, translate: "0 16px", filter: "blur(10px)" },
        { opacity: 1, translate: "0 0", filter: "blur(0px)" },
      ],
      { duration: 1300, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
    ).finished;
  }

  function tween(set, from, to, ms) {
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        set(lerp(from, to, easeInOut(k)));
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }

  function flash() {
    $("#blitz").animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.15 }, { opacity: 0 }], { duration: 1000, easing: "ease-out" });
  }

  // =========================================================
  //  Szene: Fotos
  // =========================================================
  const fotosLayer = $("#fotos");
  const FOTOS = Array.isArray(I.fotos) ? I.fotos : [];
  let imgPromises = [];

  function loadImg(src) {
    return new Promise((res) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  function layout() {
    const cardW = Math.min(W * 0.74, (H * 0.6) / 1.3525, 400);
    const cardH = cardW * 1.3525;
    const yearSize = clamp(W * 0.14, 44, 88);
    const offY = Math.min(H * 0.05, yearSize * 0.45);
    return { cardW, cardH, yearSize, offY };
  }

  function makeSlots(n, L) {
    // Raster suchen, in dem die kleinen Fotos am größten sein können
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const cw = W / cols, ch = H / rows;
      const s = Math.min((cw * 0.9) / L.cardW, (ch * 0.9) / L.cardH, 0.46);
      if (!best || s > best.s) best = { cols, rows, cw, ch, s };
    }
    const cells = [];
    for (let r = 0; r < best.rows; r++) for (let c = 0; c < best.cols; c++) cells.push({ c, r });
    return shuffle(cells).slice(0, n).map(({ c, r }) => ({
      x: (c + 0.5) * best.cw - W / 2 + rand(-0.1, 0.1) * best.cw,
      y: (r + 0.5) * best.ch - H / 2 + rand(-0.08, 0.08) * best.ch,
      r: rand(-12, 12),
      s: best.s * rand(0.92, 1.04),
    }));
  }

  const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  function buildCard(f, i, L, img) {
    const el = document.createElement("div");
    el.className = "karte";
    el.style.width = L.cardW + "px";
    el.style.height = L.cardH + "px";
    el.style.setProperty("--w", L.cardW + "px");

    const bild = document.createElement("div");
    bild.className = "bild";
    if (img) {
      img.alt = "";
      if (f.ausschnitt) img.style.objectPosition = f.ausschnitt;
      bild.append(img);
    } else {
      bild.classList.add("platzhalter");
      bild.innerHTML = CAMERA + `<span>Foto ${i + 1}</span>`;
    }

    const notiz = document.createElement("div");
    notiz.className = "notiz";
    const txt = f.text || "";
    notiz.textContent = txt;
    if (txt.length > 40) notiz.style.setProperty("--schrift", "0.052");
    else if (txt.length > 24) notiz.style.setProperty("--schrift", "0.062");

    el.append(bild, notiz);
    fotosLayer.append(el);

    const jahr = textEl("jahr", f.jahr || "");
    jahr.style.fontSize = L.yearSize + "px";
    jahr.style.top = H / 2 + L.offY - L.cardH / 2 - L.yearSize * 0.82 + "px";
    fotosLayer.append(jahr);

    return { el, jahr, notiz, img, i, media: img };
  }

  function playCard(card, dur, L) {
    const { el, jahr, notiz, slot } = card;
    el.style.zIndex = String(100 + card.i);
    const base = "translate(-50%,-50%)";
    const from = `${base} translate(${rand(-50, 50)}px, ${H * 0.75}px) rotate(${rand(-18, 18)}deg) scale(.78)`;
    const mid = `${base} translate(0px, ${L.offY}px) rotate(${rand(-3, 3)}deg) scale(1)`;
    const to = `${base} translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg) scale(${slot.s})`;

    SFX.whoosh(Math.random() < 0.5 ? -0.6 : 0.6, 0, 1.2, 0.6);
    setTimeout(() => SFX.papier(0.55), 1050);
    el.animate([{ transform: from, opacity: 0 }, { transform: mid, opacity: 1 }], {
      duration: 1500, easing: "cubic-bezier(.16,.84,.24,1)", fill: "forwards",
    });
    if (card.media) {
      card.media.animate(
        [{ transform: `scale(1.16) translate(${rand(-3, 3)}%, ${rand(-3, 3)}%)` }, { transform: "scale(1.02) translate(0,0)" }],
        { duration: dur + 1600, easing: "cubic-bezier(.3,0,.3,1)", fill: "forwards" }
      );
    }
    jahr.animate(
      [
        { opacity: 0, transform: "translate(-50%,-50%) translateY(18px)", filter: "blur(8px)", letterSpacing: "0.3em" },
        { opacity: 1, transform: "translate(-50%,-50%)", filter: "blur(0px)", letterSpacing: "0.08em" },
      ],
      { duration: 1400, delay: 250, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }
    );
    notiz.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], {
      duration: 1500, delay: 900, easing: "ease-out", fill: "both",
    });

    setTimeout(() => {
      SFX.whoosh(0, clamp(slot.x / (W / 2), -1, 1), 1.4, 0.3);
      el.animate([{ transform: mid, opacity: 1 }, { transform: to, opacity: 0.42 }], {
        duration: 1500, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards",
      });
      jahr.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).finished.then(() => jahr.remove());
    }, dur - 1400);
  }

  async function photoScene(L) {
    if (!FOTOS.length) return [];
    const dur = Math.max(3.5, I.sekundenProFoto || 7) * 1000;
    const slots = makeSlots(FOTOS.length, L);
    tween((v) => (starAlpha = v), 1, 0.7, 2000);
    const cards = [];
    for (let i = 0; i < FOTOS.length; i++) {
      const img = await Promise.race([imgPromises[i], wait(1500).then(() => null)]);
      const card = buildCard(FOTOS[i], i, L, img);
      card.slot = slots[i];
      cards.push(card);
      playCard(card, dur, L);
      await wait(dur - 900);
    }
    await wait(1300);

    // kurz alle Fotos zusammen als Wand
    cards.forEach((c, k) => c.el.animate([{ opacity: 0.42 }, { opacity: 0.85 }], { duration: 1200, delay: k * 60, easing: "ease", fill: "forwards" }));
    SFX.atem(3, 0.55);
    await wait(700);
    await showLine(I.wand, { y: 0.5, cls: "kursiv schatten", hold: 2000 });
    return cards;
  }

  // =========================================================
  //  Szene: Herz + Countdown
  // =========================================================
  async function heartScene(cards, L) {
    const cx = W / 2, cy = H * 0.42, hs = Math.min(W * 0.37, H * 0.23);
    const parts = cards.length ? particlesFromCards(cards, L, cx, cy, hs) : particlesFromStars(cx, cy, hs);
    const formedAt = parts.reduce((m, p) => Math.max(m, p.d + p.dur), 0);
    heart = { parts, cx, cy, hs, t0: performance.now(), formedAt, alpha: 1, alphaT: 1, beat: 0, kick: -1e9, boom: false };
    SFX.zerfall(formedAt / 1000);

    if (cards.length) {
      // die echten Fotos verschwinden, die Pixel übernehmen
      requestAnimationFrame(() => {
        for (const c of cards) c.el.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
        setTimeout(() => (fotosLayer.innerHTML = ""), 400);
      });
    }
    tween((v) => (starAlpha = v), 0.7, 1, 2500);

    await wait(Math.max(0, formedAt - 500));
    SFX.herzDa();
    await wait(800);
    const textY = clamp((cy + hs * 0.95 + 56) / H, 0.6, 0.86);
    for (const line of I.herz || []) await showLine(line, { y: textY, cls: "klein", hold: 2400 });
    SFX.aufbau(6.1, 0.9); // läuft bis zur Explosion
    await showLine(I.countdown, { y: textY, cls: "gold", hold: 1100 });

    heart.alphaT = 0.35;
    heart.still = true; // ab jetzt nur noch die lauten Countdown-Schläge
    for (const n of ["3", "2", "1"]) {
      heart.kick = performance.now();
      SFX.tick(0.8);
      SFX.herz(1.4);
      const el = textEl("zahl", n);
      el.style.top = cy + "px";
      texte.append(el);
      el.animate(
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(1.7)", filter: "blur(12px)" },
          { opacity: 1, transform: "translate(-50%,-50%) scale(1)", filter: "blur(0px)", offset: 0.25 },
          { opacity: 1, transform: "translate(-50%,-50%) scale(.96)", filter: "blur(0px)", offset: 0.75 },
          { opacity: 0, transform: "translate(-50%,-50%) scale(.85)", filter: "blur(6px)" },
        ],
        { duration: 1000, easing: "ease-out", fill: "forwards" }
      ).finished.then(() => el.remove());
      await wait(1000);
    }
  }

  // =========================================================
  //  Szene: Finale
  // =========================================================
  async function finale() {
    const F = I.finale || {};
    const cx = W / 2, cy = heart ? heart.cy : H * 0.42;

    // Herz explodiert
    if (heart) boomHeart();
    SFX.mitternacht();
    flash();
    burst(cx, cy, "peony", ["gold", "champ"]);
    setTimeout(() => burst(cx - W * 0.28, cy - H * 0.12, "ring", ["champ", "weiss"]), 200);
    setTimeout(() => burst(cx + W * 0.28, cy - H * 0.08, "peony", ["rosegold", "gold"]), 380);
    setTimeout(() => burst(cx, cy - H * 0.2, "willow"), 600);
    await wait(1600);

    // DANKE / PAPA aus Feuerwerk
    const words = [F.zeile1, F.zeile2].filter(Boolean);
    if (words.length) {
      const size = fitSize(words, W * 0.84, Math.min(H * 0.15, 200));
      const y1 = H * 0.42 - (words.length > 1 ? size * 0.56 : 0);
      const jobs = words.map((w, i) => wait(i * 1300).then(() => textFirework(w, y1 + i * size * 1.12, size)));
      const groups = await Promise.all(jobs);
      SFX.wunderkerze(5.8, 0.7);
      ambientGap = 1100;
      nextAmbient = performance.now() + 600;
      await wait(4800);
      groups.forEach(releaseText);
      SFX.fallen();
      await wait(1300);
    }

    // Frohes neues Jahr 2027
    ambientGap = 1300;
    const nj = F.neujahrKlein ? addLine(F.neujahrKlein, { y: 0.3, cls: "kursiv" }) : null;
    await wait(500);
    if (F.neujahrGross) {
      const size = fitSize([F.neujahrGross], W * 0.72, Math.min(H * 0.2, 240));
      const g = await textFirework(F.neujahrGross, H * 0.47, size);
      SFX.neujahr();
      SFX.wunderkerze(4.6, 0.6);
      await wait(4300);
      releaseText(g);
      SFX.fallen();
    } else {
      await wait(4000);
    }
    if (nj) await nj.hide(900);
    await wait(500);

    // Schluss
    ambientGap = 1700;
    ambientOben = true;
    const box = document.createElement("div");
    box.className = "schluss";
    const wunsch = textEl("wunsch", F.wunsch || "");
    const klein = F.wunschKlein ? textEl("wunsch-klein", F.wunschKlein) : null;
    const abs = textEl("absender", F.absender || "");
    box.append(...[wunsch, klein, abs].filter(Boolean));
    texte.append(box);
    SFX.schluss();
    appear(wunsch);
    if (klein) {
      await wait(1800);
      appear(klein);
      await wait(3800);
    } else {
      await wait(3600);
    }
    appear(abs);
    await wait(2600);

    const again = $("#nochmal");
    again.hidden = false;
    again.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
    ambientGap = 2200;
    setTimeout(() => fadeVolume(0, 6000), 25000);
  }

  // =========================================================
  //  Musik, Bildschirm wach halten
  // =========================================================
  const audio = $("#musik");
  const tonBtn = $("#ton");
  let hasMusic = !!I.musik;

  function fadeVolume(to, ms) {
    const from = audio.volume;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      try { audio.volume = clamp(lerp(from, to, k), 0, 1); } catch (e) { /* iPhone erlaubt das nicht */ }
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function startMusic() {
    if (!hasMusic) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* egal */ }
    try { audio.volume = 0; } catch (e) { /* egal */ }
    const at = +I.musikStartBei || 0;
    if (at > 0) {
      const seek = () => { try { audio.currentTime = at; } catch (e) { /* egal */ } };
      if (audio.readyState >= 1) seek();
      else audio.addEventListener("loadedmetadata", seek, { once: true });
    }
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    fadeVolume(1, 2500);
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { /* egal */ }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeLock) keepAwake();
  });

  tonBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    SFX.mute(audio.muted);
    tonBtn.classList.toggle("stumm", audio.muted);
    tonBtn.setAttribute("aria-label", audio.muted ? "Ton an" : "Ton aus");
  });

  // =========================================================
  //  Start, Sperre, Ablauf
  // =========================================================
  function parseLocal(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s || "");
    if (!m) return new Date(0);
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  const unlockAt = parseLocal(I.freischaltung);

  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('700 80px "Cinzel"'),
      document.fonts.load('600 80px "Cormorant Garamond"'),
      document.fonts.load('500 40px "Cormorant Garamond"'),
      document.fonts.load('700 30px "Caveat"'),
    ]).catch(() => {}),
    wait(3000),
  ]);

  function hideScreen(el) {
    return el.animate(
      [{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }, { opacity: 0, transform: "scale(1.04)", filter: "blur(6px)" }],
      { duration: 700, easing: "ease", fill: "forwards" }
    ).finished.then(() => { el.hidden = true; });
  }

  function showLock() {
    const el = $("#sperre");
    el.hidden = false;
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const ms = unlockAt - Date.now();
      if (ms <= 0) {
        clearInterval(iv);
        hideScreen(el).then(showStart);
        return;
      }
      const t = Math.floor(ms / 1000);
      $("#cd-tage").textContent = pad(Math.floor(t / 86400));
      $("#cd-std").textContent = pad(Math.floor((t % 86400) / 3600));
      $("#cd-min").textContent = pad(Math.floor((t % 3600) / 60));
      $("#cd-sek").textContent = pad(t % 60);
    };
    const iv = setInterval(tick, 1000);
    tick();
  }

  function showStart() {
    $("#start").hidden = false;
    // Fotos + Musik schon mal laden
    imgPromises = FOTOS.map((f) => loadImg(f.datei));
    if (hasMusic) {
      audio.src = I.musik;
      audio.addEventListener("error", () => { hasMusic = false; }, { once: true });
    }
  }

  async function begin() {
    const btn = $("#los");
    btn.disabled = true;
    SFX.init(); // Sound-Maschine starten (geht nur direkt nach einem Tipp)
    SFX.start();
    startMusic();
    keepAwake();
    try {
      const de = document.documentElement;
      if (de.requestFullscreen && /Android/i.test(navigator.userAgent)) de.requestFullscreen().catch(() => {});
    } catch (e) { /* egal */ }

    await hideScreen($("#start"));
    tonBtn.hidden = false;
    await fontsReady;
    await wait(400);

    const L = layout();
    const all = !SZENE;
    if (all) for (const line of I.einleitung || []) await showLine(line, { hold: 2300 });
    let cards = [];
    if (all || SZENE === "fotos") cards = await photoScene(L);
    if (SZENE !== "finale") await heartScene(cards, L);
    await finale();
  }

  // Texte aus inhalt.js in die Seite schreiben
  document.querySelectorAll("[data-text]").forEach((el) => {
    const v = get(el.dataset.text);
    if (v != null) el.textContent = v;
  });

  $("#los").addEventListener("click", begin, { once: true });
  $("#nochmal").addEventListener("click", () => location.reload());

  if (!TEST && Date.now() < unlockAt.getTime()) showLock();
  else showStart();
})();
