/*!
 * Continuum Lab animated mark, v1.0.0
 * A faithful, framework-free port of the renderer used on https://www.continuumlab.in
 * (src/components/home/continuum-canvas.tsx at commit ae51c85, 11 Oct 2026).
 * Same seed, colours, geometry and timing, so every product shows the identical loop.
 *
 * Usage: <script src="continuum-mark.js" defer></script>
 *
 *   <continuum-mark></continuum-mark>                     logo size (64 x 36), follows the page theme
 *   <continuum-mark theme="dark"></continuum-mark>        pin for a dark panel
 *   <continuum-mark theme="light"></continuum-mark>       pin for a white panel
 *   <continuum-mark variant="hero"></continuum-mark>      the large hero render (motes and bloom); size it with CSS
 *   <continuum-mark still></continuum-mark>               one still frame
 *
 *   <continuum-lockup product="Signal"></continuum-lockup>               endorsed: mark + product, "by Continuum Lab"
 *   <continuum-lockup product="Signal" layout="lab"></continuum-lockup>  lab-first: mark + Continuum Lab | Signal
 *   <continuum-lockup></continuum-lockup>                                the Continuum Lab logo itself
 *
 * theme="auto" (default) reads <html data-theme="light|dark"> like the website does,
 * then a "dark" / "light" class on <html>, then the OS setting.
 * Respects prefers-reduced-motion (renders one still frame), pauses off-screen and in hidden tabs.
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || window.customElements?.get("continuum-mark")) return;

  var SAMPLES = 420;
  var FIBERS = 22;
  var MOTES = 140;
  var TAU = Math.PI * 2;
  var VIOLET = [123, 92, 255];
  var PALE = [206, 210, 255];
  var MAGENTA = [224, 86, 253];
  var ON_LIGHT = {};
  ON_LIGHT[VIOLET.join()] = [64, 40, 190];
  ON_LIGHT[PALE.join()] = [20, 22, 45];
  ON_LIGHT[MAGENTA.join()] = [150, 30, 185];
  var FIT = { w: 0.42, h: 0.85, cy: 0.5 };

  function centre(t) {
    return [Math.sin(t), 0.5 * Math.sin(2 * t), 0.32 * Math.cos(t)];
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pageTheme() {
    var root = document.documentElement;
    var dt = root.getAttribute("data-theme");
    if (dt === "light" || dt === "dark") return dt;
    if (root.classList.contains("dark")) return "dark";
    if (root.classList.contains("light")) return "light";
    return window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  /** Builds a renderer on a canvas. Returns { draw(t), resize(), setPhase(p) }. */
  function createRenderer(canvas, opts) {
    var ctx = canvas.getContext("2d");
    var compact = opts.compact;
    var onLight = opts.onLight;
    var rand = mulberry32(20261003);
    var allFibers = [];
    for (var i = 0; i < FIBERS * 2; i++) {
      var strand = i < FIBERS ? 0 : 1;
      var accent = strand === 0 && rand() < 0.18;
      var f = {
        strand: strand,
        jitterR: (rand() - 0.5) * 0.05,
        jitterA: rand() * TAU,
        width: 0.5 + rand() * 1.1,
        alpha: 0.05 + rand() * 0.11,
      };
      var c = accent ? MAGENTA : strand === 0 ? VIOLET : PALE;
      f.colour = onLight ? ON_LIGHT[c.join()] : c;
      allFibers.push(f);
    }
    var fibers = compact ? allFibers.filter(function (_, i) { return i % 3 === 0; }) : allFibers;
    var motes = [];
    for (var m = 0; m < (compact ? 0 : MOTES); m++) {
      motes.push({ t: rand() * TAU, speed: 0.02 + rand() * 0.05, off: (rand() - 0.5) * 0.22, ang: rand() * TAU, size: 0.4 + rand() * 1.2 });
    }
    var glow = document.createElement("canvas");
    var gctx = glow.getContext("2d");
    var w = 0, h = 0, dpr = 1, phase = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, compact ? 3 : 1.5);
      if (compact) dpr = Math.max(dpr, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      glow.width = Math.max(1, Math.round(w / 4));
      glow.height = Math.max(1, Math.round(h / 4));
    }

    function project(p, rotY, tiltX) {
      var cy = Math.cos(rotY), sy = Math.sin(rotY);
      var x = p[0] * cy + p[2] * sy;
      var z = -p[0] * sy + p[2] * cy;
      var cx = Math.cos(tiltX), sx = Math.sin(tiltX);
      var y = p[1] * cx - z * sx;
      z = p[1] * sx + z * cx;
      var scale = Math.min(w * FIT.w, h * FIT.h);
      var persp = 2.6 / (2.6 + z);
      return { x: w / 2 + x * scale * persp, y: h * FIT.cy + y * scale * persp, z: z, persp: persp };
    }

    function fiberPoint(f, t, twistT) {
      var c = centre(t);
      var spread = (0.03 + 0.14 * Math.pow(Math.abs(Math.sin(t)), 1.4)) * (compact ? 0.3 : 1);
      var twist = 3 * t + twistT + (f.strand ? Math.PI : 0);
      var r = spread + (compact ? 0 : f.jitterR);
      var a = twist + f.jitterA * 0.15;
      return [c[0], c[1] + Math.cos(a) * r, c[2] + Math.sin(a) * r];
    }

    function draw(t0) {
      if (canvas.width === 0 || canvas.height === 0) return;
      var time = compact ? t0 * 4 : t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = onLight ? "source-over" : "lighter";
      ctx.lineCap = "round";

      var ph = phase == null ? 0 : phase;
      var looped = phase != null;
      var rotY = 0.55 * Math.sin(looped ? TAU * ph : time * 0.045) - 0.2;
      var tiltX = -0.38 + 0.06 * Math.sin(looped ? TAU * ph : time * 0.031);
      var twistT = looped ? TAU * ph : time * 0.35;

      var CHUNK = 14;
      for (var fi = 0; fi < fibers.length; fi++) {
        var f = fibers[fi];
        var prev = project(fiberPoint(f, 0, twistT), rotY, tiltX);
        for (var i = 1; i <= SAMPLES; i += CHUNK) {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          var zsum = 0, n = 0;
          for (var j = i; j < i + CHUNK && j <= SAMPLES; j++) {
            var p = project(fiberPoint(f, (j / SAMPLES) * TAU, twistT), rotY, tiltX);
            ctx.lineTo(p.x, p.y);
            zsum += p.z;
            n++;
            prev = p;
          }
          var depth = 1 - Math.min(1, Math.max(0, (zsum / n + 0.6) / 1.2));
          var col = f.colour;
          var width = compact ? 0.55 + 0.35 * depth : f.width * (0.7 + 0.6 * depth);
          var alpha = (compact ? (onLight ? 0.55 : 0.32) : f.alpha * (onLight ? 3 : 1)) * (0.35 + 0.85 * depth);
          ctx.strokeStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha + ")";
          ctx.lineWidth = width;
          ctx.stroke();
        }
      }

      for (var mi = 0; mi < motes.length; mi++) {
        var mo = motes[mi];
        var tt = looped ? (mo.t + TAU * ph * (mo.speed > 0.045 ? 2 : 1)) % TAU : (mo.t + time * mo.speed) % TAU;
        var cc = centre(tt);
        var mp = project([cc[0], cc[1] + Math.cos(mo.ang + (looped ? TAU * ph : time * 0.2)) * mo.off, cc[2] + Math.sin(mo.ang) * mo.off], rotY, tiltX);
        var near = Math.max(0.15, 1 - (mp.z + 0.6) / 1.2);
        ctx.fillStyle = onLight ? "rgba(64,40,190," + 0.35 * near + ")" : "rgba(220,222,255," + 0.18 * near + ")";
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, mo.size * mp.persp, 0, TAU);
        ctx.fill();
      }

      var head = looped ? TAU * ph : (time * 0.16) % TAU;
      for (var k = 36; k >= 0; k--) {
        var tp = project(centre(head - k * 0.018), rotY, tiltX);
        var a2 = Math.pow(1 - k / 36, 2);
        ctx.fillStyle = onLight ? "rgba(64,40,190," + 0.7 * a2 + ")" : "rgba(236,238,248," + 0.35 * a2 + ")";
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, (compact ? 1.3 : 1.6) * tp.persp * (0.4 + a2), 0, TAU);
        ctx.fill();
      }
      var hp = project(centre(head), rotY, tiltX);
      var haloR = (compact ? 4.5 : 26) * hp.persp;
      var halo = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, haloR);
      halo.addColorStop(0, onLight ? "rgba(64,40,190,1)" : "rgba(255,255,255,0.95)");
      halo.addColorStop(0.15, onLight ? "rgba(123,92,255,0.5)" : "rgba(200,190,255,0.55)");
      halo.addColorStop(1, "rgba(123,92,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, haloR, 0, TAU);
      ctx.fill();

      if (gctx && !compact && !onLight) {
        gctx.globalCompositeOperation = "copy";
        gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.55;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glow, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";
    }

    return { draw: draw, resize: resize, setPhase: function (p) { phase = p; }, size: function () { return [w, h]; } };
  }

  var MARK_CSS =
    ":host{display:inline-block;width:64px;height:36px;flex-shrink:0;vertical-align:middle}" +
    ":host([variant=hero]){display:block;width:100%;height:100%}" +
    "canvas{display:block;width:100%;height:100%}";

  class ContinuumMark extends HTMLElement {
    static get observedAttributes() { return ["theme", "variant", "still"]; }
    constructor() {
      super();
      var root = this.attachShadow({ mode: "open" });
      root.innerHTML = "<style>" + MARK_CSS + "</style><canvas></canvas>";
      this._canvas = root.querySelector("canvas");
      this._raf = 0;
      this._visible = true;
      this._last = 0;
      this._loop = this._loop.bind(this);
      this._onVis = this._play.bind(this);
    }
    connectedCallback() {
      if (!this.hasAttribute("aria-hidden") && !this.hasAttribute("aria-label")) this.setAttribute("aria-hidden", "true");
      this._reduced = matchMedia("(prefers-reduced-motion: reduce)");
      this._reduced.addEventListener("change", this._onVis);
      document.addEventListener("visibilitychange", this._onVis);
      this._mo = new MutationObserver(this._themeChanged.bind(this));
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
      this._scheme = matchMedia("(prefers-color-scheme: light)");
      this._scheme.addEventListener("change", this._themeChanged.bind(this));
      this._ro = new ResizeObserver(() => {
        var s = this._r ? this._r.size() : [0, 0];
        if (Math.abs(this._canvas.clientWidth - s[0]) < 1 && Math.abs(this._canvas.clientHeight - s[1]) < 1) return;
        this._r.resize();
        this._r.draw(this._frameTime());
      });
      this._io = new IntersectionObserver((e) => { this._visible = e[0].isIntersecting; this._play(); });
      this._build();
      this._ro.observe(this._canvas);
      this._io.observe(this);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      this._ro && this._ro.disconnect();
      this._io && this._io.disconnect();
      this._mo && this._mo.disconnect();
      document.removeEventListener("visibilitychange", this._onVis);
      this._reduced && this._reduced.removeEventListener("change", this._onVis);
    }
    attributeChangedCallback() { if (this._r) this._build(); }
    get _onLight() {
      var t = this.getAttribute("theme") || "auto";
      return t === "light" || (t === "auto" && pageTheme() === "light");
    }
    _themeChanged() {
      var t = this.getAttribute("theme") || "auto";
      if (t === "auto" && this._r && this._r.onLight !== this._onLight) this._build();
    }
    _still() { return this.hasAttribute("still") || this._reduced.matches; }
    _frameTime() { return this._still() ? 42 : (performance.now() - this._start) / 1000; }
    _build() {
      var onLight = this._onLight;
      this._r = createRenderer(this._canvas, { compact: this.getAttribute("variant") !== "hero", onLight: onLight });
      this._r.onLight = onLight;
      this._start = performance.now() - 30000;
      this._r.resize();
      this._r.draw(30);
      this._play();
    }
    _play() {
      cancelAnimationFrame(this._raf);
      if (!this._r) return;
      if (this._still()) { this._r.draw(42); return; }
      if (this._visible && !document.hidden) this._raf = requestAnimationFrame(this._loop);
    }
    _loop(now) {
      if (now - this._last >= 32) { this._last = now; this._r.draw((now - this._start) / 1000); }
      this._raf = requestAnimationFrame(this._loop);
    }
    /** For exporting seamless video loops: phase 0..1 is one full cycle. */
    drawPhase(p) { cancelAnimationFrame(this._raf); this._r.setPhase(p); this._r.draw(0); }
  }

  var LOCKUP_CSS =
    ":host{display:inline-flex;align-items:center;gap:10px;color:inherit;font-family:var(--continuum-font,'Geist',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif);line-height:1}" +
    ".txt{display:flex;flex-direction:column;gap:3px}" +
    ".name{font-size:15px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap}" +
    ".by{font-size:11px;font-weight:500;letter-spacing:0.01em;opacity:.62;white-space:nowrap}" +
    ".row{display:flex;align-items:center;gap:10px}" +
    ".rule{width:1px;height:16px;background:currentColor;opacity:.22}" +
    ".prod{font-size:15px;font-weight:500;letter-spacing:-0.02em;opacity:.78;white-space:nowrap}";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  class ContinuumLockup extends HTMLElement {
    static get observedAttributes() { return ["product", "layout", "theme", "still"]; }
    constructor() { super(); this.attachShadow({ mode: "open" }); }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this.isConnected) this._render(); }
    _render() {
      var product = this.getAttribute("product");
      var layout = this.getAttribute("layout") || "endorsed";
      var theme = this.getAttribute("theme") || "auto";
      var still = this.hasAttribute("still") ? " still" : "";
      var mark = '<continuum-mark theme="' + esc(theme) + '"' + still + "></continuum-mark>";
      var text;
      if (!product) text = '<span class="name">Continuum Lab</span>';
      else if (layout === "lab") text = '<span class="row"><span class="name">Continuum Lab</span><span class="rule"></span><span class="prod">' + esc(product) + "</span></span>";
      else text = '<span class="txt"><span class="name">' + esc(product) + '</span><span class="by">by Continuum Lab</span></span>';
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", product ? product + ", by Continuum Lab" : "Continuum Lab");
      this.shadowRoot.innerHTML = "<style>" + LOCKUP_CSS + "</style>" + mark + text;
    }
  }

  customElements.define("continuum-mark", ContinuumMark);
  customElements.define("continuum-lockup", ContinuumLockup);
})();
