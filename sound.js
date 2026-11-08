/* =========================================================
   Sounds – alle live per Code erzeugt (Web Audio API).
   Keine Sound-Dateien nötig: Rauschen und Töne werden
   gefiltert und geformt, wie bei einem Synthesizer.

   Aufbau: Klang → (direkt + Hall) → Kompressor → Lautsprecher
   ========================================================= */
window.SFX = (() => {
  "use strict";

  const LAUT = 1.0; // Gesamtlautstärke aller Sounds (0 bis 1)

  let ctx = null, master, dry, wet, warm, noiseBuf, crackleBufs = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ok = () => !!ctx;
  const now = () => ctx.currentTime + 0.01;

  // ---------- Bausteine ----------
  function makeNoise(sec) {
    const b = ctx.createBuffer(1, Math.floor(sec * ctx.sampleRate), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // Hall: Rauschen, das langsam leiser wird = klingt wie ein großer Raum
  function makeImpulse(sec, decay) {
    const len = Math.floor(sec * ctx.sampleRate);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  // Knistern: viele winzige Knackser, am Anfang dichter
  function makeCrackle(sec) {
    const sr = ctx.sampleRate, len = Math.floor(sec * sr);
    const b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < 80; i++) {
      const pos = Math.floor(Math.pow(Math.random(), 1.6) * (len - sr * 0.02));
      const plen = Math.floor(rand(0.002, 0.009) * sr), amp = rand(0.25, 1);
      for (let j = 0; j < plen; j++) d[pos + j] += (Math.random() * 2 - 1) * amp * Math.pow(1 - j / plen, 2);
    }
    return b;
  }

  // Sättigung: macht tiefe Töne auch auf Handy-Lautsprechern hörbar
  function makeShaper(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    const s = ctx.createWaveShaper();
    s.curve = c;
    return s;
  }

  function bus(pan = 0, send = 0.3, gain = 1) {
    const g = ctx.createGain();
    g.gain.value = gain;
    let o = g, p = null;
    if (ctx.createStereoPanner) {
      p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      o = p;
    }
    o.connect(dry);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      o.connect(s);
      s.connect(wet);
    }
    return { in: g, pan: p };
  }

  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.start(t, rand(0, 1.5));
    s.stop(t + dur);
    return s;
  }

  function osc(type, t, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.start(t);
    o.stop(t + dur);
    return o;
  }

  // Lautstärke-Kurve: schnell rein, langsam raus
  function env(t, a, peak, d) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return g;
  }

  function filter(type, f, q = 0.7) {
    const n = ctx.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    n.Q.value = q;
    return n;
  }

  function chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  }

  // ---------- Start (muss bei einem Tipp passieren) ----------
  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone: Sounds auch abspielen, wenn der Lautlos-Schalter an ist
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* egal */ }
    try { ctx = new AC({ latencyHint: "interactive" }); } catch (e) { ctx = new AC(); }

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master = ctx.createGain();
    master.gain.value = LAUT;
    comp.connect(master);
    master.connect(ctx.destination);

    dry = ctx.createGain();
    dry.connect(comp);
    const verb = ctx.createConvolver();
    verb.buffer = makeImpulse(3.2, 2.4);
    wet = ctx.createGain();
    wet.gain.value = 0.7;
    wet.connect(verb);
    verb.connect(comp);

    noiseBuf = makeNoise(2);
    crackleBufs = [makeCrackle(1.8), makeCrackle(1.8), makeCrackle(1.8)];

    // "warmer" Kanal mit Sättigung für Herzschlag + Wumms
    warm = makeShaper(2.5);
    const wg = ctx.createGain();
    wg.gain.value = 0.85;
    warm.connect(wg);
    wg.connect(dry);
    const ws = ctx.createGain();
    ws.gain.value = 0.2;
    wg.connect(ws);
    ws.connect(wet);

    // iPhone entsperren: winziger stiller Ton
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
    if (ctx.resume) ctx.resume().catch(() => {});

    document.addEventListener("visibilitychange", () => {
      if (!ctx || !ctx.resume) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    });
  }

  function mute(an) {
    if (!ok()) return;
    master.gain.setTargetAtTime(an ? 0 : LAUT, ctx.currentTime, 0.05);
  }

  // =========================================================
  //  Die einzelnen Sounds
  // =========================================================

  // Rakete steigt auf: Abschuss-Plopp + Rauschen, das hochzieht (manche pfeifen)
  function rakete(x = 0.5, dur = 1.2, laut = 1) {
    if (!ok()) return;
    const t = now(), b = bus((x - 0.5) * 1.5, 0.3, 0.7 * laut);
    const o = osc("sine", t, 0.25);
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
    chain(o, env(t, 0.004, 0.45 * laut, 0.18), warm);

    const bp = filter("bandpass", 500, 1.2);
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.06);
    g.gain.linearRampToValueAtTime(0.2, t + dur * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    chain(noise(t, dur + 0.15), bp, g, b.in);

    if (Math.random() < 0.45) {
      const f0 = rand(1000, 1500);
      const w = osc("sine", t, dur + 0.05);
      w.frequency.setValueAtTime(f0, t);
      w.frequency.exponentialRampToValueAtTime(f0 * rand(1.7, 2.3), t + dur);
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.0001, t);
      wg.gain.linearRampToValueAtTime(0.06, t + 0.2);
      wg.gain.setValueAtTime(0.06, t + Math.max(0.25, dur * 0.85));
      wg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      chain(w, wg, b.in);
    }
  }

  // Explosion: Knall + tiefer Wumms (+ Knistern)
  function knall(x = 0.5, size = 1, crackle = false, laut = 1) {
    if (!ok()) return;
    const t = now() + rand(0, 0.05), L = laut * size;
    const b = bus((x - 0.5) * 1.5, 0.6, 1);
    const lp = filter("lowpass", 6000, 0.5);
    lp.frequency.setValueAtTime(clamp(3500 * size + 1500, 1500, 7000), t);
    lp.frequency.exponentialRampToValueAtTime(160, t + 1.8);
    chain(noise(t, 2.4), lp, env(t, 0.005, 0.95 * L, 2.0), b.in);

    const o = osc("sine", t, 1.0);
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.6);
    chain(o, env(t, 0.004, 0.85 * L, 0.8), warm);

    if (crackle) knistern(t + rand(0.3, 0.5), x, 0.8 * laut);
  }

  function knistern(t, x = 0.5, laut = 0.8) {
    if (!ok()) return;
    const b = bus((x - 0.5) * 1.6, 0.4, 1);
    const s = ctx.createBufferSource();
    s.buffer = crackleBufs[(Math.random() * crackleBufs.length) | 0];
    s.playbackRate.value = rand(0.85, 1.2);
    const g = ctx.createGain();
    g.gain.value = 0.55 * laut;
    chain(s, filter("highpass", rand(1800, 3200), 0.7), g, b.in);
    s.start(t == null ? now() : t);
  }

  // Herzschlag: "Ba-dum"
  function herz(st = 1, delay = 0) {
    if (!ok()) return;
    const t0 = now() + delay;
    for (const [d, a] of [[0, 1], [0.253, 0.65]]) {
      const t = t0 + d, A = a * st;
      const o = osc("sine", t, 0.4);
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
      chain(o, env(t, 0.006, 0.9 * A, 0.26), warm);
      // Oberton, damit man den Schlag auch auf kleinen Handy-Lautsprechern hört
      const o2 = osc("triangle", t, 0.3);
      o2.frequency.setValueAtTime(190, t);
      o2.frequency.exponentialRampToValueAtTime(96, t + 0.12);
      chain(o2, env(t, 0.005, 0.8 * A, 0.18), warm);
      chain(noise(t, 0.12), filter("lowpass", 700, 1), env(t, 0.003, 0.9 * A, 0.07), warm);
    }
  }

  // Foto fliegt rein: Luftzug, der durch den Raum wandert
  function whoosh(from = -0.6, to = 0, dur = 1.1, laut = 0.6) {
    if (!ok()) return;
    const t = now(), b = bus(from, 0.35, 1);
    if (b.pan) {
      b.pan.pan.setValueAtTime(clamp(from, -1, 1), t);
      b.pan.pan.linearRampToValueAtTime(clamp(to, -1, 1), t + dur);
    }
    const bp = filter("bandpass", 400, 0.9);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.55);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.75 * laut, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(noise(t, dur + 0.1), bp, g, b.in);
  }

  // Polaroid landet: leises Papier-Tippen
  function papier(laut = 0.5) {
    if (!ok()) return;
    const t = now(), b = bus(0, 0.2, 1);
    chain(noise(t, 0.06), filter("bandpass", 2200, 1.5), env(t, 0.002, 0.8 * laut, 0.05), b.in);
    const o = osc("sine", t, 0.15);
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    chain(o, env(t, 0.003, 0.35 * laut, 0.09), warm);
  }

  // Glitzer: viele feine, hohe "Pings" mit viel Hall
  // richtung: 0 = zufällig, 1 = steigt, -1 = fällt
  function glitzer(n = 12, dur = 1, laut = 0.5, x = 0.5, richtung = 0) {
    if (!ok()) return;
    const t0 = now();
    const buses = [-0.6, 0, 0.6].map((p) => bus(p + (x - 0.5), 0.85, 1));
    for (let i = 0; i < n; i++) {
      const k = Math.random(), t = t0 + k * dur;
      let f = rand(2600, 6800);
      if (richtung) f *= Math.pow(2, richtung * (k - 0.5) * 1.4);
      const o = osc(Math.random() < 0.5 ? "sine" : "triangle", t, 0.75);
      o.frequency.value = f;
      chain(o, env(t, 0.002, rand(0.07, 0.17) * laut, rand(0.15, 0.55)), buses[i % 3].in);
    }
  }

  function sternschnuppe(x = 0.5) {
    if (!ok()) return;
    glitzer(6, 0.6, 0.35, x, -1);
    const t = now(), b = bus((x - 0.5) * 1.4, 0.7, 1);
    const bp = filter("bandpass", 6000, 2);
    bp.frequency.setValueAtTime(7000, t);
    bp.frequency.exponentialRampToValueAtTime(2500, t + 0.8);
    chain(noise(t, 0.9), bp, env(t, 0.15, 0.08, 0.65), b.in);
  }

  // Sanftes Anschwellen wie ein Atemzug (für Texte)
  function atem(dur = 2.2, laut = 0.35) {
    if (!ok()) return;
    const t = now(), b = bus(0, 0.7, 1);
    const lp = filter("lowpass", 300, 0.6);
    lp.frequency.setValueAtTime(250, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.45);
    lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * laut, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(noise(t, dur + 0.1), lp, g, b.in);
  }

  // Spannungsaufbau: wird immer heller, lauter, tiefer grollend
  function aufbau(dur = 6, laut = 0.8) {
    if (!ok()) return;
    const t = now(), end = t + dur, b = bus(0, 0.5, 1);
    const bp = filter("bandpass", 200, 1.6);
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(6000, end);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6 * laut, end - 0.02);
    g.gain.linearRampToValueAtTime(0.0001, end + 0.03);
    chain(noise(t, dur + 0.05), bp, g, b.in);

    const o = osc("sawtooth", t, dur + 0.05);
    o.frequency.setValueAtTime(40, t);
    o.frequency.exponentialRampToValueAtTime(70, end);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.35 * laut, end - 0.02);
    g2.gain.linearRampToValueAtTime(0.0001, end + 0.03);
    chain(o, filter("lowpass", 160, 1), g2, warm);
  }

  // Kino-Einschlag: großer Wumms mit langem Nachhall
  function einschlag(laut = 1) {
    if (!ok()) return;
    const t = now(), b = bus(0, 0.9, 1);
    const lp = filter("lowpass", 8000, 0.4);
    lp.frequency.setValueAtTime(9000, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 2.8);
    chain(noise(t, 3.5), lp, env(t, 0.004, 1.0 * laut, 3.2), b.in);
    const o = osc("sine", t, 3.2);
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 1.6);
    chain(o, env(t, 0.005, 1.1 * laut, 2.8), warm);
    const o2 = osc("triangle", t, 1.2);
    o2.frequency.setValueAtTime(220, t);
    o2.frequency.exponentialRampToValueAtTime(80, t + 0.5);
    chain(o2, env(t, 0.003, 0.5 * laut, 0.9), b.in);
  }

  // Glocke (wie Kirchenglocken um Mitternacht)
  const PARTIALS = [
    [0.5, 0.55, 6], [1, 1, 4.5], [1.183, 0.5, 3.5], [1.506, 0.35, 3], [2, 0.7, 3.2],
    [2.514, 0.25, 2], [2.662, 0.3, 1.8], [3.011, 0.22, 1.4], [4.166, 0.18, 1.1], [5.433, 0.12, 0.8],
  ];
  function glocke(f = 196, laut = 0.6, delay = 0) {
    if (!ok()) return;
    const t = now() + delay, b = bus(0, 0.8, 1);
    for (const [r, a, d] of PARTIALS) {
      const o = osc("sine", t, d + 0.1);
      o.frequency.value = f * r * rand(0.998, 1.002);
      chain(o, env(t, 0.004, a * laut * 0.22, d), b.in);
    }
    chain(noise(t, 0.05), filter("bandpass", f * 6, 2), env(t, 0.001, 0.3 * laut, 0.04), b.in);
  }

  // Uhr-Ticken für den Countdown
  function tick(laut = 0.7) {
    if (!ok()) return;
    const t = now(), b = bus(0, 0.3, 1);
    chain(noise(t, 0.06), filter("bandpass", 3200, 4), env(t, 0.001, 3.2 * laut, 0.045), b.in);
    const o = osc("square", t, 0.08);
    o.frequency.value = 1800;
    chain(o, filter("bandpass", 1800, 6), env(t, 0.001, 1.2 * laut, 0.05), b.in);
    const o2 = osc("sine", t, 0.1);
    o2.frequency.value = 900;
    chain(o2, env(t, 0.001, 0.5 * laut, 0.06), b.in);
  }

  // Wunderkerze: Zischen + Knistern, solange die Schrift funkelt
  function wunderkerze(dur = 5, laut = 0.5) {
    if (!ok()) return;
    const t = now(), b = bus(0, 0.3, 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 * laut, t + 0.4);
    g.gain.setValueAtTime(0.12 * laut, t + Math.max(0.5, dur - 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(noise(t, dur), filter("highpass", 4000, 0.7), g, b.in);
    for (let i = 0; i < Math.ceil(dur / 1.4); i++) knistern(t + i * 1.4, rand(0.3, 0.7), 0.6 * laut);
  }

  // ---------- Zusammengesetzte Momente ----------
  const momente = {
    start() { glitzer(14, 1.4, 0.6, 0.5, 1); atem(2.6, 0.5); },
    zeile() { atem(2.4, 0.3); glitzer(5, 1.0, 0.3); },
    zerfall(dur) { glitzer(70, dur, 0.55, 0.5, 1); aufbau(dur, 0.3); },
    herzDa() { atem(2.6, 0.55); glitzer(18, 1.6, 0.5); },
    schrift() { glitzer(45, 1.8, 0.8, 0.5, 0.5); },
    fallen() { glitzer(22, 1.6, 0.45, 0.5, -1); },
    mitternacht() { einschlag(1); glocke(196, 0.75, 0.05); glocke(196, 0.5, 2.6); },
    neujahr() { glocke(262, 0.5, 0); glocke(262, 0.4, 1.8); glitzer(30, 2, 0.6, 0.5, 1); },
    schluss() { atem(3, 0.5); glitzer(24, 2.4, 0.55, 0.5, 1); },
  };

  // Schutz: Wenn ein Sound mal nicht klappt, läuft die Animation trotzdem weiter
  const api = {
    init, mute, rakete, knall, knistern, herz, whoosh, papier, glitzer,
    sternschnuppe, atem, aufbau, einschlag, glocke, tick, wunderkerze, ...momente,
  };
  for (const [name, fn] of Object.entries(api)) {
    api[name] = (...args) => {
      try { return fn(...args); } catch (e) { console.warn("Sound", name, e); }
    };
  }
  return api;
})();
