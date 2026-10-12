/* ============================================================
   CRD — hero mascot: a crocodile built from toy bricks.

   It lives on the top edge of the hero photo, which is both its riverbank
   and its waterline. It walks along the edge, dives behind it with a
   splash, glides with only its eyes above the water, leaps back out,
   snaps, looks down at the children, basks in sunglasses, and eats any
   brick a visitor drops by clicking the photo. Clicking the crocodile
   itself makes it do a trick. Since nobody guesses a mascot can be played
   with, it says so in speech bubbles, in the page's language.

   Everything is drawn and driven from this file. Delete it and its
   <script> tag and the hero is a plain photo again; the rules that place
   its layers are under "hero mascot" in styles.css.

   Visitors whose system asks for reduced motion get the crocodile sitting
   still on the edge. Adding ?motion=on to the address overrides that, to
   preview the animation on machines that switch animations off, such as
   remote desktops.

   Written with async/await, unlike main.js: a browser too old to parse it
   loses only the mascot, never the rest of the site.
   ============================================================ */
(function () {
  "use strict";

  var hero = document.querySelector(".hero");
  var visual = document.querySelector(".hero-visual");
  var photo = visual && visual.querySelector("img");
  if (!hero || !visual || !photo || !window.requestAnimationFrame || !window.Promise) return;

  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !document.documentElement.classList.contains("motion-on");

  /* ── the drawing ──────────────────────────────────────────
     Side view, facing right, in a 400 × 170 box. Feet stand on y=160; when
     swimming, y=98 sits on the waterline, which leaves the eyes, the
     nostrils and the studs along the back showing. Every brick gets a
     top-lit gradient and a dark seam, which is most of the "toy" look. */
  var VB_W = 400;
  var VB_H = 170;
  var FEET = 160;
  var WATER = 98;
  var CROWN = 48; // top of the brows: the tallest point when standing
  var JAW_MAX = 24; // degrees the lower jaw drops when wide open

  var SEAM = ' stroke="#123f22" stroke-opacity=".4" stroke-width="1.3" stroke-linejoin="round"';
  var TOOTH = ' fill="#FFFDF3" stroke="#B8AE8A" stroke-width=".8" stroke-linejoin="round"';

  function paint(f) { return f.charAt(0) === "#" ? f : "url(#croc-g-" + f + ")"; }
  function grad(id, a, b, c) {
    return '<linearGradient id="croc-g-' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset=".5" stop-color="' + b + '"/>' +
      '<stop offset="1" stop-color="' + c + '"/></linearGradient>';
  }
  function rect(x, y, w, h, r, f) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r +
      '" fill="' + paint(f) + '"' + SEAM + "/>";
  }
  function circ(cx, cy, r, f) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + paint(f) + '"' + SEAM + "/>";
  }
  function path(d, f) { return '<path d="' + d + '" fill="' + paint(f) + '"' + SEAM + "/>"; }
  function studs(x0, n, step, y, tone) {
    var out = "";
    for (var i = 0; i < n; i++) out += '<use href="#croc-stud-' + tone + '" x="' + (x0 + i * step) + '" y="' + y + '"/>';
    return out;
  }
  function spikes(xs, y, w, h) {
    return xs.map(function (x) {
      return path("M" + x + " " + y + "l" + w / 2 + " " + -h + "l" + w / 2 + " " + h + "z", "dk");
    }).join("");
  }
  function teeth(xs, y, down) {
    var h = down ? 6.5 : -6.5;
    return xs.map(function (x) {
      return '<path d="M' + x + " " + y + "l4.5 " + h + "l4.5 " + -h + 'z"' + TOOTH + "/>";
    }).join("");
  }
  // A round 1×1 tile with a glint: the crocodile's scales.
  function tile(cx, cy, r) {
    return circ(cx, cy, r, "lt") +
      '<circle cx="' + (cx - r * 0.35) + '" cy="' + (cy - r * 0.38) + '" r="' + r * 0.3 + '" fill="#fff" opacity=".5"/>';
  }
  // Thigh hanging from the hip, a foot plate on the ground, claws forward.
  // The far-side legs are darker and stand a touch higher, for depth.
  function leg(cls, hx, hy, near) {
    var fy = near ? 145 : 143;
    var out = '<g class="' + cls + '">' +
      rect(hx - 13, hy - 8, 26, fy - hy + 12, 8, near ? "md" : "fr") +
      rect(hx - 18, fy, 42, near ? 15 : 14, 6, near ? "dk" : "fd");
    if (near) {
      for (var i = 0; i < 3; i++) {
        out += '<path d="M' + (hx + 23) + " " + (fy + 2.2 + i * 4.2) + 'l6.5 2l-6.5 2z"' + TOOTH + "/>";
      }
      out += tile(hx, hy + 4, 4.6);
    }
    return out + "</g>";
  }
  // Eye: white, a pupil group that looks around, and two lids that close
  // from the top (blink) and rise from the bottom (happy squint).
  function eye(id, cx, cy, r, pr, lid) {
    return '<g clip-path="url(#croc-clip-e' + id + ')">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#croc-g-eye)"/>' +
      '<g class="c-p' + id + '">' +
        '<circle cx="' + (cx + r * 0.2) + '" cy="' + (cy + 1) + '" r="' + pr + '" fill="#141414"/>' +
        '<circle cx="' + (cx + r * 0.45) + '" cy="' + (cy - r * 0.25) + '" r="' + pr * 0.36 + '" fill="#fff"/>' +
        '<circle cx="' + (cx + r * 0.08) + '" cy="' + (cy + r * 0.45) + '" r="' + pr * 0.16 + '" fill="#fff"/>' +
      "</g>" +
      '<rect class="c-l' + id + 't" x="' + (cx - r - 1) + '" y="' + (cy - r - 1) + '" width="' + (2 * r + 2) +
        '" height="0" fill="' + paint(lid) + '"' + SEAM + "/>" +
      '<rect class="c-l' + id + 'b" x="' + (cx - r - 1) + '" y="' + (cy + r + 1) + '" width="' + (2 * r + 2) +
        '" height="0" fill="' + paint(lid) + '"' + SEAM + "/>" +
    "</g>" +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#123f22" stroke-opacity=".55" stroke-width="1.5"/>';
  }

  // The water that laps along the body while swimming: a wave longer than
  // the crocodile, slid by one wavelength in a loop and clipped to its length.
  var wave = "M-30 " + WATER;
  for (var w = 0; w < 31; w++) wave += w ? "t15 0" : "q7.5 -8 15 0";

  var SVG =
    '<svg class="croc-svg" viewBox="0 0 400 170" focusable="false" aria-hidden="true"><defs>' +
      grad("dk", "#4AA65A", "#2E7D3E", "#1F5C2D") +
      grad("md", "#7CCB6E", "#52B052", "#3B8F40") +
      grad("lt", "#C2E57D", "#9BCD4C", "#7FB13C") +
      grad("bl", "#F5F7C0", "#E3E98F", "#C8CF63") +
      grad("fr", "#41904D", "#2D6F39", "#205329") +
      grad("fd", "#2B6835", "#1F5128", "#163E1E") +
      '<radialGradient id="croc-g-eye" cx=".4" cy=".34" r=".75"><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#E2EAE4"/></radialGradient>' +
      '<linearGradient id="croc-g-splash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4FDFF"/><stop offset="1" stop-color="#7FD3F5"/></linearGradient>' +
      '<g id="croc-stud-dk"><rect x="-3.6" y="-4.6" width="7.2" height="5" rx="1.4" fill="url(#croc-g-dk)"' + SEAM + '/><rect x="-2.3" y="-3.8" width="1.4" height="2.6" rx=".7" fill="#fff" opacity=".45"/></g>' +
      '<g id="croc-stud-md"><rect x="-3.6" y="-4.6" width="7.2" height="5" rx="1.4" fill="url(#croc-g-md)"' + SEAM + '/><rect x="-2.3" y="-3.8" width="1.4" height="2.6" rx=".7" fill="#fff" opacity=".45"/></g>' +
      '<clipPath id="croc-clip-en"><circle cx="278" cy="74" r="14"/></clipPath>' +
      '<clipPath id="croc-clip-ef"><circle cx="303" cy="67" r="11"/></clipPath>' +
      '<clipPath id="croc-clip-wake"><rect x="2" y="60" width="398" height="50"/></clipPath>' +
    "</defs>" +
    '<g class="c-all">' +
      leg("c-legfb", 180, 122, false) + leg("c-legff", 258, 122, false) +
      // Tail: each joint nests the next, so a swish travels down it like a wave.
      '<g class="c-t1"><g class="c-t2"><g class="c-t3"><g class="c-t4">' +
        path("M46 118V138H18Q9 138 13 132Z", "md") + rect(18, 132, 28, 6, 3, "lt") +
      "</g>" + rect(40, 113, 34, 18, 5, "md") + rect(42, 129, 30, 9, 4, "lt") + spikes([46, 57], 114, 8, 7) +
      "</g>" + rect(68, 107, 40, 22, 5, "md") + rect(70, 127, 36, 11, 4, "lt") + spikes([73, 85, 97], 108, 9, 8) +
      "</g>" + rect(100, 101, 44, 26, 6, "md") + rect(102, 125, 40, 14, 4.5, "lt") + spikes([105, 117, 129], 102, 10, 9) +
      "</g>" +
      // Body: a little brick wall, studs along the back, round tiles for scales.
      '<g class="c-body">' +
        rect(132, 86, 132, 11, 5, "dk") + studs(142, 10, 12, 86, "dk") +
        rect(130, 96, 70, 22, 4, "md") + rect(199, 96, 66, 22, 4, "md") +
        rect(132, 117, 46, 15, 3, "lt") + rect(177, 117, 60, 15, 3, "lt") + rect(236, 117, 28, 15, 3, "lt") +
        rect(136, 131, 126, 12, 6, "bl") +
        tile(153, 107, 4.2) + tile(176, 105, 3.6) + tile(214, 107, 4) +
      "</g>" +
      leg("c-legnb", 162, 126, true) +
      '<g class="c-head">' +
        // The inside of the mouth: reshaped every frame to fill the gap the
        // jaw opens, and flat (so hidden) while it is shut.
        '<path class="c-mouth" d="M264 118H388V126L268 127Z" fill="#7A1F2B"/>' +
        '<g class="c-jaw">' +
          '<ellipse cx="302" cy="124" rx="22" ry="5" fill="#F07A8E"/>' +
          path("M264 124H378Q391 124 391 132Q391 140 379 140H276Q264 140 264 131Z", "bl") +
          teeth([311, 325, 339, 353, 367], 124.4, false) +
        "</g>" +
        rect(242, 82, 80, 28, 13, "md") +
        rect(244, 104, 60, 23, 9, "lt") +
        rect(294, 97, 98, 27, 11, "md") +
        rect(298, 111, 92, 13, 6, "lt") +
        studs(310, 4, 13, 97, "md") +
        rect(365, 89, 25, 11, 5, "dk") +
        '<ellipse cx="373" cy="93.6" rx="2.3" ry="1.5" fill="#0F3019"/><ellipse cx="382" cy="93.6" rx="2.3" ry="1.5" fill="#0F3019"/>' +
        teeth([303, 317, 331, 345, 359, 373], 123.6, true) +
        '<path d="M256 114Q262 125 280 124.5" fill="none" stroke="#1D5A30" stroke-width="2.4" stroke-linecap="round"/>' +
        '<ellipse cx="265" cy="114" rx="7.5" ry="4.3" fill="#FF7F86" opacity=".55"/>' +
        circ(302, 72, 15, "dk") + eye("f", 303, 67, 11, 6.4, "dk") +
        circ(277, 78, 19, "md") + eye("n", 278, 74, 14, 8.2, "md") +
        '<g class="c-brows" fill="#4A3426">' +
          '<rect x="264" y="55" width="26" height="6.5" rx="3.2" transform="rotate(-12 277 58)"/>' +
          '<rect x="294" y="51" width="20" height="5.5" rx="2.7" transform="rotate(10 304 54)"/>' +
        "</g>" +
        '<g class="c-shades" opacity="0" stroke="#5BC0BE" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M262 70L244 75" fill="none"/>' +
          '<rect x="261" y="62" width="34" height="22" rx="9" fill="#141B33"/>' +
          '<rect x="292" y="57" width="25" height="18" rx="8" fill="#141B33"/>' +
          '<path d="M295 69Q294 64 292 66" fill="none"/>' +
          '<path class="c-glint" d="M267 66l7 13M297 60l5 10" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="2.6"/>' +
        "</g>" +
      "</g>" +
      leg("c-legnf", 240, 126, true) +
      '<g class="c-wake" clip-path="url(#croc-clip-wake)" opacity="0">' +
        '<path class="c-wave" d="' + wave + '" fill="none" stroke="#E8FBFF" stroke-width="3.2" stroke-linecap="round"/>' +
        '<ellipse class="c-bow" cx="394" cy="97" rx="10" ry="5" fill="#F2FCFF"/>' +
      "</g>" +
    "</g></svg>";

  // The splash sheet thrown up where the crocodile breaks the surface.
  var CROWN_SVG = '<svg viewBox="0 0 120 60" aria-hidden="true">' +
    '<path d="M4 60C12 52 14 40 10 26c8 10 12 16 18 16 2-12 0-24 6-36 4 12 6 26 12 32 4-10 6-22 12-30 4 10 6 22 12 30 6-8 8-20 12-32 6 12 4 24 6 36 6 0 10-6 18-16-4 14-2 26 6 34z" fill="url(#croc-g-splash)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="34" cy="3" r="3" fill="#E9FAFF"/><circle cx="58" cy="9" r="2.6" fill="#E9FAFF"/><circle cx="86" cy="4" r="3" fill="#E9FAFF"/></svg>';

  var HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8.3a4.2 4.2 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z" fill="#FF5C7C" stroke="#fff" stroke-width="1.6"/></svg>';

  function brickSvg(c) {
    var line = ' fill="' + c + '" stroke="rgba(0,0,0,.28)" stroke-width="1"';
    return '<svg viewBox="0 0 32 24" aria-hidden="true">' +
      '<rect x="5" y="1.5" width="8" height="5.5" rx="1.6"' + line + "/>" +
      '<rect x="19" y="1.5" width="8" height="5.5" rx="1.6"' + line + "/>" +
      '<rect x="1.5" y="6" width="29" height="16.5" rx="2.5"' + line + "/>" +
      '<rect x="4" y="8.2" width="24" height="3" rx="1.5" fill="#fff" opacity=".28"/>' +
      '<rect x="6.6" y="2.6" width="1.6" height="3.2" rx=".8" fill="#fff" opacity=".45"/>' +
      '<rect x="20.6" y="2.6" width="1.6" height="3.2" rx=".8" fill="#fff" opacity=".45"/></svg>';
  }
  var BRICK_COLOURS = ["#D01012", "#F5C518", "#006CB7", "#FE8A18", "#A83D9A"];

  /* ── the layers ───────────────────────────────────────────
     The stage sits on the photo's top edge and clips everything below it:
     that line is the waterline. Back effects live in the stage; the front
     layer sits over the photo, for droplets that splash onto the picture. */
  var stage = document.createElement("div");
  stage.className = "croc-stage";
  stage.setAttribute("aria-hidden", "true");
  // The brick floats in front of the crocodile, so it stays in sight until
  // the jaws close on it.
  stage.innerHTML = '<div class="croc-fx"></div><div class="croc"><div class="croc-inner">' + SVG +
    '</div></div><div class="croc-fx croc-fx-top"></div>';
  visual.insertBefore(stage, visual.firstChild);

  var fxFront = document.createElement("div");
  fxFront.className = "croc-fx-front";
  fxFront.setAttribute("aria-hidden", "true");
  visual.insertBefore(fxFront, visual.querySelector(".hero-badge"));

  var fxBack = stage.querySelector(".croc-fx");
  var fxTop = stage.querySelector(".croc-fx-top");
  var crocEl = stage.querySelector(".croc");
  var inner = stage.querySelector(".croc-inner");
  var svg = stage.querySelector("svg");
  function part(cls) { return svg.querySelector("." + cls); }
  var P = {
    all: part("c-all"), head: part("c-head"), jaw: part("c-jaw"), mouth: part("c-mouth"), brows: part("c-brows"),
    t1: part("c-t1"), t2: part("c-t2"), t3: part("c-t3"), t4: part("c-t4"),
    legNB: part("c-legnb"), legNF: part("c-legnf"), legFB: part("c-legfb"), legFF: part("c-legff"),
    pn: part("c-pn"), pf: part("c-pf"),
    lnT: part("c-lnt"), lnB: part("c-lnb"), lfT: part("c-lft"), lfB: part("c-lfb"),
    shades: part("c-shades"), glint: part("c-glint"),
    wake: part("c-wake"), wave: part("c-wave"), bow: part("c-bow")
  };

  /* ── state ────────────────────────────────────────────────
     x is the crocodile's left edge along the photo, in px. lift is how far
     its feet are above the edge: 0 standing, negative under water. Angles
     are in degrees, everything else runs 0..1. */
  var s = {
    x: 0, lift: 0, dir: -1, turn: -1, tilt: 0, spin: 0, sx: 1, sy: 1, hop: 0,
    walk: 0, walkPh: 0, walkAmp: 0, swim: 0, tuck: 0, shake: 0,
    tailAmp: 5, tailFreq: 2.4, tailPh: 0,
    headTilt: 0, kick: 0, jaw: 0, lid: 0, squint: 0, brow: 0, shades: 0, glint: 0,
    px: 0, py: 0, look: null, lookAt: null, wet: 0, wavePh: 0, poking: false
  };

  // Geometry, refreshed by measure(): W photo width, CW crocodile width,
  // k px per drawing unit, sc effect scale (1 on a desktop-sized photo).
  var W = 600, CW = 240, k = 0.6, sc = 1, space = 120, maxLift = 60;
  var minX = 6, maxX = 300, eyesLift = -40, hiddenLift = -90;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function sign() { return s.turn >= 0 ? 1 : -1; }

  function measure() {
    W = visual.clientWidth || 600;
    CW = Math.round(clamp(W * 0.42, 150, 320));
    k = CW / VB_W;
    sc = k / 0.64;
    crocEl.style.width = CW + "px";
    space = Math.max(0, visual.getBoundingClientRect().top - hero.getBoundingClientRect().top);
    maxLift = Math.max(0, space - (FEET - CROWN) * k - 8);
    eyesLift = -(FEET - WATER) * k;
    hiddenLift = -(FEET - 28) * k;
    minX = 6;
    maxX = Math.max(minX, W - CW - 6);
    s.x = clamp(s.x, minX, maxX);
  }

  // Drawing units → px from the photo's top-left corner (y up is negative).
  function at(ux, uy) {
    return {
      x: s.x + CW / 2 + (ux - VB_W / 2) * k * sign(),
      y: -(s.lift + s.hop) - (FEET - uy) * k
    };
  }
  function centreX() { return s.x + CW / 2; }

  /* ── tweens and the clock ─────────────────────────────────
     A behaviour is an async function built from tween() and sleep(). run()
     starts one and cancels whatever was running: the old behaviour's
     pending tweens are rejected on the next frame, which unwinds it. The
     clock only advances while the hero is on screen. */
  var E = {
    lin: function (t) { return t; },
    inQ: function (t) { return t * t; },
    outQ: function (t) { return t * (2 - t); },
    io: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    back: function (t) { var c = 1.70158; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; },
    elastic: function (t) {
      return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },
    bounce: function (t) {
      var n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    }
  };
  var CANCEL = { cancelled: true };
  var clock = 0, runId = 0, tweens = [], timers = [];

  function tween(obj, to, dur, ease) {
    return new Promise(function (resolve, reject) {
      tweens.push({ obj: obj, to: to, from: null, t: 0, dur: Math.max(dur, 1e-4), ease: ease || E.io,
        resolve: resolve, reject: reject, run: runId });
    });
  }
  function sleep(sec) { return tween(null, null, sec); }
  // Fire-and-forget effects on the same clock. Not cancelled with the
  // behaviour that scheduled them: a splash already on its way lands anyway.
  function later(sec, fn) { timers.push({ t: sec, fn: fn }); }

  function stepTweens(dt) {
    for (var i = 0; i < tweens.length; i++) {
      var tw = tweens[i];
      if (tw.run !== runId) { tweens.splice(i--, 1); tw.reject(CANCEL); continue; }
      var key;
      if (tw.obj && !tw.from) { tw.from = {}; for (key in tw.to) tw.from[key] = tw.obj[key]; }
      tw.t += dt;
      var p = Math.min(1, tw.t / tw.dur);
      if (tw.obj) {
        var e = tw.ease(p);
        for (key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      }
      if (p >= 1) { tweens.splice(i--, 1); tw.resolve(); }
    }
    for (var j = 0; j < timers.length; j++) {
      var tm = timers[j];
      tm.t -= dt;
      if (tm.t <= 0) { timers.splice(j--, 1); tm.fn(); }
    }
  }

  function run(fn) {
    var id = ++runId;
    s.walk = 0; s.swim = 0; s.tuck = 0; s.shake = 0; s.hop = 0;
    s.look = null; s.lookAt = null; s.tailAmp = 5; s.tailFreq = 2.4; s.poking = false;
    Promise.resolve().then(fn).then(function () {
      if (id === runId) run(life);
    }, function (err) {
      if (err !== CANCEL && window.console) console.error(err);
    });
  }

  /* ── effects ──────────────────────────────────────────── */
  function fx(cls, front, x, y, w, h) {
    var el = document.createElement("div");
    el.className = cls;
    el.style.left = x.toFixed(1) + "px";
    el.style.top = y.toFixed(1) + "px";
    if (w) el.style.width = w.toFixed(1) + "px";
    if (h) el.style.height = h.toFixed(1) + "px";
    (front ? fxFront : fxBack).appendChild(el);
    return el;
  }
  function play(el, frames, ms, easing) {
    if (!el.animate) { el.remove(); return; }
    el.animate(frames, { duration: ms, easing: easing || "ease-out", fill: "forwards" })
      .onfinish = function () { el.remove(); };
  }

  // Droplets fly on the frame loop with real gravity; the rest are short
  // fire-and-forget Web Animations.
  var drops = [], pool = [];
  function drop(x, y, vx, vy, size, front) {
    var el = pool.pop() || document.createElement("div");
    el.className = "croc-drop";
    el.style.width = el.style.height = size.toFixed(1) + "px";
    el.style.margin = (-size / 2).toFixed(1) + "px 0 0 " + (-size / 2).toFixed(1) + "px";
    el.style.opacity = "";
    (front ? fxFront : fxBack).appendChild(el);
    var d = { el: el, x: x, y: y, vx: vx, vy: vy, front: front, age: 0 };
    drops.push(d);
    return d;
  }
  function stepDrops(dt) {
    var g = 1300 * sc;
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.age += dt;
      d.vy += g * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      var dead = d.age > 2.2 || (d.front && d.y > 64 * sc);
      if (!d.front && d.vy > 0 && d.y > 0) {
        dead = true;
        if (Math.random() < 0.22) ripple(d.x, 9 * sc, 0.5);
      }
      if (dead) {
        drops.splice(i, 1);
        d.el.remove();
        if (pool.length < 80) pool.push(d.el);
        continue;
      }
      var sp = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      var st = 1 + Math.min(sp / 700, 0.8);
      d.el.style.transform = "translate3d(" + d.x.toFixed(1) + "px," + d.y.toFixed(1) + "px,0) rotate(" +
        (Math.atan2(d.vy, d.vx) * 57.3 + 90).toFixed(0) + "deg) scale(" + (1 / Math.sqrt(st)).toFixed(2) + "," + st.toFixed(2) + ")";
      if (d.front && d.y > 0) d.el.style.opacity = Math.max(0, 1 - d.y / (64 * sc)).toFixed(2);
    }
  }

  function ripple(x, w, strength) {
    var h = w * 0.3;
    var el = fx("croc-ripple", false, x - w, -h, 2 * w, 2 * h);
    play(el, [{ transform: "scale(.12)", opacity: 0.9 * strength }, { transform: "scale(1)", opacity: 0 }],
      900 + w * 8, "cubic-bezier(.15,.7,.35,1)");
  }
  function crown(x, w) {
    var el = fx("croc-crown", false, x - w / 2, -w / 2, w);
    el.innerHTML = CROWN_SVG;
    play(el, [
      { transform: "scale(.3,.1)", opacity: 1 },
      { transform: "scale(1,1)", opacity: 1, offset: 0.28 },
      { transform: "scale(1.12,.85)", opacity: 0.85, offset: 0.55 },
      { transform: "scale(1.22,.2)", opacity: 0 }
    ], 780, "cubic-bezier(.2,.7,.3,1)");
    // a puff of white foam where the water broke
    var f = fx("croc-foam", false, x - w * 0.6, -w * 0.16, w * 1.2, w * 0.32);
    play(f, [{ transform: "scale(.3)", opacity: 1 }, { transform: "scale(1)", opacity: 0 }], 700);
  }
  function splash(x, power) {
    var p = power || 1, v = Math.sqrt(sc);
    crown(x, 120 * p * sc);
    var n = Math.round(20 * p);
    for (var i = 0; i < n; i++) {
      var d = drop(x + rand(-18, 18) * p * sc, -2, rand(-210, 210) * p * v, -rand(250, 520) * Math.sqrt(p) * v,
        rand(4, 10) * sc, Math.random() < 0.4);
      if (i % 4 === 0) d.el.className = "croc-drop is-foam";
    }
    ripple(x, 46 * p * sc, 1);
    later(0.12, function () { ripple(x, 74 * p * sc, 0.8); });
    later(0.3, function () { ripple(x, 100 * p * sc, 0.5); });
  }
  function bubble(x, big) {
    var r = (big ? rand(7, 9) : rand(3.5, 6)) * sc;
    var el = fx("croc-bubble", false, x - r, -r * 1.2, 2 * r, 2 * r);
    play(el, [
      { transform: "translateY(" + r.toFixed(1) + "px) scale(.4)", opacity: 0 },
      { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.55 },
      { transform: "translateY(" + (-r).toFixed(1) + "px) scale(1.5)", opacity: 0 }
    ], 650);
    ripple(x, 10 * sc, 0.5);
  }
  // Water running off the body after it climbs out.
  function drip() {
    for (var i = 0; i < 12; i++) {
      var p = at(rand(60, 300), rand(110, 140));
      drop(p.x, p.y, rand(-40, 40) * sc, rand(-60, 20) * sc, rand(3, 6) * sc, Math.random() < 0.5);
    }
  }
  // The shake after a swim: water flung off both sides, like a wet dog.
  function spray() {
    var p = at(rand(70, 330), rand(95, 135));
    var side = Math.random() < 0.5 ? -1 : 1, v = Math.sqrt(sc);
    drop(p.x, p.y, side * rand(140, 300) * v, -rand(60, 220) * v, rand(3, 6) * sc, Math.random() < 0.5);
  }
  function heart(delay) {
    later(delay || 0, function () {
      var p = at(rand(262, 300), 46);
      var size = 16 * sc + 4, dx = rand(-26, 26);
      var el = fx("croc-heart", true, p.x - size / 2, p.y - size, size);
      el.innerHTML = HEART_SVG;
      play(el, [
        { transform: "translate(0,0) scale(.3)", opacity: 0 },
        { transform: "translate(" + (dx * 0.4).toFixed(1) + "px,-18px) scale(1)", opacity: 1, offset: 0.25 },
        { transform: "translate(" + dx.toFixed(1) + "px,-62px) scale(.8)", opacity: 0 }
      ], 1300);
    });
  }
  function exclaim() {
    var p = at(292, 30);
    var el = fx("croc-alert", true, p.x - 11, p.y - 26, 22, 22);
    el.textContent = "!";
    play(el, [
      { transform: "translateY(8px) scale(.2)", opacity: 0 },
      { transform: "translateY(0) scale(1.18)", opacity: 1, offset: 0.25 },
      { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.7 },
      { transform: "translateY(-6px) scale(1)", opacity: 0 }
    ], 950);
  }
  function burp() {
    var p = at(392, 120), r = 8 * sc;
    var el = fx("croc-bubble", true, p.x - r, p.y - r, 2 * r, 2 * r);
    play(el, [
      { transform: "translate(0,0) scale(.3)", opacity: 0 },
      { transform: "translate(" + 8 * sign() + "px,-22px) scale(1)", opacity: 1, offset: 0.6 },
      { transform: "translate(" + 12 * sign() + "px,-34px) scale(1.7)", opacity: 0 }
    ], 1100);
  }

  /* ── speech bubbles ───────────────────────────────────────
     It greets the visitor, then asks to be fed and tickled until both have
     been tried, then only chats now and then. The lines are the croc.* keys
     in i18n.js, read in whatever language the page is showing at the time.
     What the visitor has already discovered is kept in localStorage, so a
     returning visitor is not nagged; if storage is blocked it simply asks
     again next time. One bubble at a time, with a pause between them. */
  var TOUCH = window.matchMedia("(hover: none)").matches;
  var seen = { fed: false, poked: false };
  try {
    var saved = JSON.parse(localStorage.getItem("crd-croc") || "{}");
    seen.fed = !!saved.fed;
    seen.poked = !!saved.poked;
  } catch (e) { /* private mode */ }
  function remember(what) {
    if (seen[what]) return;
    seen[what] = true;
    try { localStorage.setItem("crd-croc", JSON.stringify(seen)); } catch (e) { /* private mode */ }
  }

  var talk = document.createElement("div");
  talk.className = "croc-say";
  talk.innerHTML = '<div class="croc-say-in"></div>';
  fxFront.appendChild(talk);
  var talkIn = talk.firstChild;
  var talking = false, talkUntil = 0, talkBelow = false, talkW = 0, talkH = 0, nextTalk = 0, talkAnim = null;

  function line(key) {
    var dict = window.CRD_I18N || {};
    var d = dict[document.documentElement.lang] || dict.en || {};
    return (TOUCH && d[key + "@touch"]) || d[key] || (dict.en && dict.en[key]) || "";
  }
  // force: say it now, over whatever it was saying (a reaction to a click).
  // Otherwise it waits its turn and keeps quiet while under water.
  function say(key, force) {
    if (STILL || s.lift < eyesLift - 2) return false;
    if (!force && (talking || clock < nextTalk)) return false;
    var text = line(key);
    if (!text) return false;
    talkIn.textContent = text;
    if (key === "croc.feed" || key === "croc.dropIt") talkIn.insertAdjacentHTML("beforeend", brickSvg("#F5C518"));
    if (talkAnim) talkAnim.cancel();
    talk.style.display = "block";
    talkW = talk.offsetWidth;
    talkH = talk.offsetHeight;
    // Above the head when there is room under the top of the hero, else
    // hanging just below the edge, over the photo, pointing up at it.
    talkBelow = at(285, CROWN).y - talkH - 14 < 4 - space;
    talk.classList.toggle("is-below", talkBelow);
    talking = true;
    talkUntil = clock + clamp(1.8 + text.length * 0.055, 2.6, 5.5);
    nextTalk = talkUntil + (seen.fed && seen.poked ? 14 : 7);
    placeTalk();
    if (talkIn.animate) {
      talkAnim = talkIn.animate([
        { transform: "scale(.3)", opacity: 0 },
        { transform: "scale(1.07)", opacity: 1, offset: 0.65 },
        { transform: "scale(1)", opacity: 1 }
      ], { duration: 340, easing: "cubic-bezier(.2,.8,.3,1.2)" });
    }
    return true;
  }
  function hush() {
    talking = false;
    if (!talkIn.animate) { talk.style.display = "none"; return; }
    talkAnim = talkIn.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.85)", opacity: 0 }],
      { duration: 200, easing: "ease-in", fill: "forwards" });
    talkAnim.onfinish = function () { if (!talking) talk.style.display = "none"; };
  }
  // Follows the head while it walks, leaps or swims; the tail stays on it.
  function placeTalk() {
    var head = at(285, CROWN);
    var x = clamp(head.x - talkW / 2, -8, W - talkW + 8);
    var y = talkBelow ? 18 : Math.max(4 - space, head.y - talkH - 14);
    var tail = clamp(head.x - x, 18, talkW - 18);
    talk.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    talk.style.setProperty("--tail", tail.toFixed(1) + "px");
    talkIn.style.transformOrigin = tail.toFixed(1) + "px " + (talkBelow ? "0" : "100%");
  }
  function stepTalk() {
    if (!talking) return;
    if (clock >= talkUntil || s.lift < eyesLift - 2) hush();
    else placeTalk();
  }
  // Between moves: the hints until both tricks are found, then small talk.
  var hintTurn = 0;
  function hint() {
    if (seen.fed && seen.poked) {
      if (Math.random() < 0.3) say(Math.random() < 0.5 ? "croc.snack" : "croc.hello");
      return;
    }
    // Feeding first, then tickling, alternating; a hint that could not be
    // said (another bubble was up) keeps its turn.
    var feedNext = !seen.fed && (seen.poked || hintTurn % 2 === 0);
    if (say(feedNext ? "croc.feed" : "croc.poke")) hintTurn++;
  }
  function chatter(key, chance) {
    if (seen.fed && seen.poked && Math.random() < chance) say(key);
  }

  /* ── the brick a visitor drops ────────────────────────────
     It falls from above the hero, splashes onto the waterline, bobs there
     half sunk, and waits to be eaten. One at a time. */
  var brick = null;
  function dropBrick(x) {
    if (brick) return null;
    var w = Math.max(16, 38 * k), h = w * 0.75;
    var colour = BRICK_COLOURS[Math.floor(Math.random() * BRICK_COLOURS.length)];
    var el = fx("croc-brick", false, 0, 0, w, h);
    fxTop.appendChild(el);
    el.innerHTML = brickSvg(colour);
    var edge = 12 + 22 * k;
    brick = { el: el, colour: colour, w: w, h: h, x: clamp(x, edge, W - edge), y: -(space + h + 30), vy: 0,
      rot: rand(-40, 40), vr: rand(-320, 320), state: "fall", hit: false };
    stepBrick(0);
    return brick;
  }
  function stepBrick(dt) {
    var b = brick;
    if (!b) return;
    if (b.state === "fall") {
      b.vy += 1500 * sc * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      if (b.y >= 0) {
        b.y = 0;
        if (!b.hit) { b.hit = true; splash(b.x, 0.45); }
        if (b.vy > 240 * sc) { b.vy *= -0.28; b.vr *= 0.3; } else { b.state = "float"; b.vy = 0; }
      }
    } else {
      b.y = b.h * 0.22 + Math.sin(clock * 3.2) * 1.5;
      b.rot += (Math.sin(clock * 2.1) * 7 - b.rot) * Math.min(1, dt * 5);
    }
    b.el.style.transform = "translate3d(" + (b.x - b.w / 2).toFixed(1) + "px," + (b.y - b.h).toFixed(1) +
      "px,0) rotate(" + b.rot.toFixed(1) + "deg)";
  }
  function gulp(b) {
    if (brick !== b) return;
    var m = at(386, 126), v = Math.sqrt(sc);
    for (var i = 0; i < 9; i++) {
      var d = drop(m.x + rand(-6, 6), m.y + rand(-4, 4), rand(-140, 140) * v, -rand(90, 240) * v, rand(3, 5) * sc, true);
      d.el.className = "croc-drop is-crumb";
      d.el.style.setProperty("--crumb", b.colour);
    }
    b.el.remove();
    brick = null;
  }

  /* ── frame loop ───────────────────────────────────────── */
  var ptr = { x: 0, y: 0, t: -9 };
  var blinkAt = -9, blinkNext = 1.5, wakeNext = 0, lastX = 0;

  function animate(dt) {
    // Legs advance with the distance actually covered, so feet never skate.
    var vx = dt ? (s.x - lastX) / dt : 0;
    lastX = s.x;
    var moving = Math.min(1, Math.abs(vx) / (30 * sc));
    s.walkAmp += ((s.walk || s.swim ? moving : 0) - s.walkAmp) * Math.min(1, dt * 10);
    s.walkPh += Math.abs(vx) * dt * 0.14 / sc;
    s.tailPh += dt * s.tailFreq;
    s.wavePh = (s.wavePh + dt * (16 + 40 * s.swim)) % 30;
    if (s.kick > 0) s.kick = Math.max(0, s.kick - dt * 4);

    if (clock >= blinkNext) { blinkAt = clock; blinkNext = clock + rand(2.2, 5.5); }

    // Where the eyes look: at the pointer if it moved lately, else at
    // whatever the behaviour asked for, else ahead.
    var tx = 0.45, ty = 0.1;
    if (clock - ptr.t < 2.5 || s.lookAt) {
      var e = at(278, 74);
      var gx = clock - ptr.t < 2.5 ? ptr.x : s.lookAt.x;
      var gy = clock - ptr.t < 2.5 ? ptr.y : s.lookAt.y;
      var dx = gx - e.x, dy = gy - e.y, dist = Math.max(60, Math.sqrt(dx * dx + dy * dy));
      tx = dx / dist * sign();
      ty = dy / dist;
    } else if (s.look) {
      tx = s.look.x; ty = s.look.y;
    }
    s.px += (tx - s.px) * Math.min(1, dt * 9);
    s.py += (ty - s.py) * Math.min(1, dt * 9);

    if (s.swim > 0.5 && s.wet > 0.5 && moving > 0.3 && clock >= wakeNext) {
      wakeNext = clock + 0.3;
      var tail = at(60, WATER);
      ripple(tail.x, 14 * sc, 0.55);
    }
    if (s.shake > 0.3 && Math.random() < s.shake * 0.6) spray();
  }

  function set(el, attr, v) {
    var key = "_" + attr;
    if (el[key] !== v) { el[key] = v; el.setAttribute(attr, v); }
  }
  function rot(a, x, y) { return "rotate(" + a.toFixed(2) + " " + x + " " + y + ")"; }

  function render() {
    var sg = sign();
    var lift = s.lift + s.hop + (s.wet > 0.5 ? Math.sin(clock * 2.6) * 1.2 : 0);
    // The box runs 10 units below the feet (room for claws and the open jaw),
    // so it is dropped by that much to stand the feet on the edge.
    crocEl.style.transform = "translate3d(" + s.x.toFixed(1) + "px," + (-lift + (VB_H - FEET) * k).toFixed(1) + "px,0) rotate(" +
      (s.spin * sg).toFixed(1) + "deg)";
    inner.style.transform = "scale(" + (s.turn * s.sx).toFixed(3) + "," + s.sy.toFixed(3) + ") rotate(" + s.tilt.toFixed(1) + "deg)";

    var a = Math.sin(s.walkPh) * 22 * s.walkAmp, tuck = 28 * s.tuck;
    var bob = -Math.abs(Math.cos(s.walkPh)) * 2 * s.walkAmp * (s.walk ? 1 : 0);
    var shake = s.shake ? Math.sin(clock * 38) * 5 * s.shake : 0;
    set(P.all, "transform", "translate(0 " + bob.toFixed(2) + ")" + (shake ? " rotate(" + shake.toFixed(2) + " 200 150)" : ""));
    set(P.legNB, "transform", rot(a + tuck, 162, 126));
    set(P.legFF, "transform", rot(a * 0.9 + tuck, 258, 122));
    set(P.legNF, "transform", rot(-a + tuck, 240, 126));
    set(P.legFB, "transform", rot(-a * 0.9 + tuck, 180, 122));

    var A = s.tailAmp, ph = s.tailPh;
    set(P.t1, "transform", rot(A * 0.35 * Math.sin(ph), 138, 120));
    set(P.t2, "transform", rot(A * 0.6 * Math.sin(ph - 0.9), 102, 123));
    set(P.t3, "transform", rot(A * 0.85 * Math.sin(ph - 1.8), 70, 126));
    set(P.t4, "transform", rot(A * 1.1 * Math.sin(ph - 2.7), 44, 129));

    set(P.head, "transform", rot(s.headTilt + s.kick * Math.sin(clock * 55) * 4, 262, 112));
    var jawAngle = s.jaw * JAW_MAX;
    set(P.jaw, "transform", rot(jawAngle, 268, 124));
    set(P.mouth, "d", "M264 118H388V" + (126 + Math.tan(jawAngle * Math.PI / 180) * 122).toFixed(1) + "L268 127Z");
    set(P.brows, "transform", "translate(0 " + (-s.brow * 4.5).toFixed(2) + ")");

    set(P.pn, "transform", "translate(" + (s.px * 3.6).toFixed(2) + " " + (s.py * 3.2).toFixed(2) + ")");
    set(P.pf, "transform", "translate(" + (s.px * 2.6).toFixed(2) + " " + (s.py * 2.4).toFixed(2) + ")");
    var bt = clock - blinkAt, lid = Math.max(s.lid, bt < 0.18 ? Math.sin(Math.PI * bt / 0.18) : 0);
    set(P.lnT, "height", (30 * lid).toFixed(2));
    set(P.lfT, "height", (24 * lid).toFixed(2));
    set(P.lnB, "y", (89 - 15 * s.squint).toFixed(2));
    set(P.lnB, "height", (15 * s.squint).toFixed(2));
    set(P.lfB, "y", (79 - 12 * s.squint).toFixed(2));
    set(P.lfB, "height", (12 * s.squint).toFixed(2));

    set(P.shades, "opacity", s.shades > 0.01 ? Math.min(1, s.shades * 3).toFixed(2) : "0");
    set(P.shades, "transform", "translate(0 " + ((1 - s.shades) * -55).toFixed(2) + ")");
    set(P.glint, "transform", "translate(" + (s.glint * 18).toFixed(2) + " 0)");

    set(P.wake, "opacity", clamp(s.wet, 0, 1).toFixed(2));
    set(P.wave, "transform", "translate(" + (-s.wavePh).toFixed(2) + " 0)");
    var bow = 0.3 + 0.9 * s.swim * s.walkAmp;
    set(P.bow, "transform", "translate(394 97) scale(" + bow.toFixed(2) + ") translate(-394 -97)");
  }

  var rafId = 0, last = 0, onScreen = true;
  function frame(ts) {
    rafId = 0;
    // Capped so a long pause (a background tab) never fast-forwards the scene,
    // but high enough that a slow machine still plays it at full speed.
    var dt = last ? Math.min((ts - last) / 1000, 0.1) : 1 / 60;
    last = ts;
    clock += dt;
    stepTweens(dt);
    animate(dt);
    stepDrops(dt);
    stepBrick(dt);
    render();
    stepTalk();
    if (onScreen) rafId = requestAnimationFrame(frame);
  }
  function wake() {
    if (!rafId && onScreen) { last = 0; rafId = requestAnimationFrame(frame); }
  }

  /* ── moves ────────────────────────────────────────────── */
  function inWater() { return s.lift < -6; }
  function farX() {
    var x = rand(minX, maxX);
    for (var i = 0; i < 6 && Math.abs(x - s.x) < (maxX - minX) * 0.3; i++) x = rand(minX, maxX);
    return x;
  }
  function roomAhead() { return s.dir > 0 ? maxX - s.x : s.x - minX; }

  function settle(d) {
    s.spin = ((s.spin % 360) + 540) % 360 - 180;
    return tween(s, { jaw: 0, headTilt: 0, tilt: 0, spin: 0, sx: 1, sy: 1, squint: 0, brow: 0, shades: 0,
      lid: 0, hop: 0, turn: s.dir }, d || 0.25);
  }
  async function face(dir) {
    if (s.dir === dir && s.turn === dir) return;
    s.dir = dir;
    await tween(s, { turn: dir }, 0.24);
  }
  async function walkTo(x, speed, endDir) {
    x = clamp(x, minX, maxX);
    if (Math.abs(x - s.x) > 3) {
      await face(x > s.x ? 1 : -1);
      s.walk = 1; s.tailAmp = 8; s.tailFreq = 6;
      await tween(s, { x: x }, Math.abs(x - s.x) / ((speed || 100) * sc));
      s.walk = 0; s.tailAmp = 5; s.tailFreq = 2.4;
    }
    if (endDir && endDir !== s.dir) await face(endDir);
  }
  async function land() {
    await tween(s, { lift: 0, tilt: 0 }, 0.22, E.inQ);
    await squash();
  }
  async function squash() {
    await tween(s, { sy: 0.84, sx: 1.08 }, 0.08, E.outQ);
    await tween(s, { sy: 1, sx: 1 }, 0.45, E.elastic);
  }
  async function snap(times) {
    for (var i = 0; i < times; i++) {
      await tween(s, { jaw: 1, brow: 0.7, headTilt: -7 }, 0.13, E.outQ);
      await sleep(0.06);
      await tween(s, { jaw: 0, headTilt: 0 }, 0.07, E.inQ);
      s.kick = 1;
      await sleep(0.16);
    }
    await tween(s, { brow: 0 }, 0.2);
  }
  async function chew() {
    for (var i = 0; i < 2; i++) {
      await tween(s, { jaw: 0.35 }, 0.11, E.outQ);
      await tween(s, { jaw: 0 }, 0.11, E.inQ);
    }
  }
  async function happy(sec, hearts) {
    s.tailAmp = 15; s.tailFreq = 12;
    if (hearts) { heart(0); heart(0.18); heart(0.36); }
    await tween(s, { squint: 0.9, brow: 0.7 }, 0.18);
    await sleep(sec);
    s.tailAmp = 5; s.tailFreq = 2.4;
    await tween(s, { squint: 0, brow: 0 }, 0.25);
  }
  async function shakeOff() {
    s.tailAmp = 14; s.tailFreq = 13;
    await tween(s, { shake: 1, squint: 0.7 }, 0.1);
    await sleep(0.55);
    await tween(s, { shake: 0 }, 0.18);
    s.tailAmp = 5; s.tailFreq = 2.4;
    await tween(s, { squint: 0 }, 0.25);
  }

  // Land → water: a hop forward and a nose-dive through the edge.
  async function dive() {
    if (roomAhead() < 50 * sc) await face(-s.dir);
    await tween(s, { sy: 0.86, sx: 1.06 }, 0.14, E.outQ);
    var apex = clamp(maxLift * 0.45, 8, 40 * sc);
    var x = clamp(s.x + s.dir * 60 * sc, minX, maxX);
    var down = 0.42, cross = down * Math.sqrt(apex / (apex - hiddenLift));
    s.tuck = 1;
    await Promise.all([
      tween(s, { x: x }, 0.26 + down, E.lin),
      (async function () {
        await tween(s, { lift: apex, sy: 1.05, sx: 0.96, tilt: -12 }, 0.26, E.outQ);
        later(cross * 0.85, function () { splash(centreX() + s.dir * CW * 0.28, 1); });
        await tween(s, { lift: hiddenLift, sy: 1, sx: 1, tilt: 42 }, down, E.inQ);
      })()
    ]);
    s.tuck = 0; s.tilt = 0;
  }
  // Under water → eyes just above it, with a ripple where they break through.
  async function surface() {
    s.wet = 1;
    ripple(at(290, WATER).x, 22 * sc, 0.8);
    await tween(s, { lift: eyesLift }, 0.55, E.outQ);
  }
  async function swimTo(x, speed, endDir) {
    x = clamp(x, minX, maxX);
    if (s.lift < eyesLift - 4 * k) await surface();
    s.wet = 1;
    if (Math.abs(x - s.x) > 3) {
      await face(x > s.x ? 1 : -1);
      s.swim = 1;
      await tween(s, { x: x }, Math.abs(x - s.x) / ((speed || 80) * sc));
      s.swim = 0;
    }
    if (endDir && endDir !== s.dir) await face(endDir);
  }
  // Water → land the dramatic way: dip, burst out in an arc, land wet.
  async function leapOut(dist) {
    if (roomAhead() < 60 * sc) await face(-s.dir);
    var x = clamp(s.x + s.dir * (dist == null ? 70 : dist) * sc, minX, maxX);
    await tween(s, { lift: eyesLift - 16 * k }, 0.22, E.inQ);
    var apex = clamp(maxLift * 0.85, 12, 95 * sc);
    s.tuck = 1;
    splash(centreX() + s.dir * CW * 0.25, 1.05);
    s.wet = 0;
    await Promise.all([
      tween(s, { x: x }, 0.72, E.lin),
      (async function () {
        await tween(s, { lift: apex, tilt: -16 }, 0.38, E.outQ);
        await tween(s, { lift: 0, tilt: 5 }, 0.34, E.inQ);
      })()
    ]);
    s.tuck = 0;
    splash(centreX(), 0.5);
    drip();
    await tween(s, { sy: 0.84, sx: 1.08, tilt: 0 }, 0.08, E.outQ);
    await tween(s, { sy: 1, sx: 1 }, 0.45, E.elastic);
  }
  // Water → land the quiet way: rise where it is and climb out.
  async function emerge() {
    splash(centreX(), 0.5);
    s.wet = 0;
    await tween(s, { lift: 0 }, 0.45, E.back);
    drip();
    await shakeOff();
  }
  async function lookKids() {
    if (Math.random() < 0.5) say("croc.kids");
    s.look = { x: 0.3, y: 1 };
    await tween(s, { headTilt: 11, squint: 0.35, brow: 0.3 }, 0.45);
    s.tailAmp = 9; s.tailFreq = 4;
    await sleep(1.7);
    s.tailAmp = 5; s.tailFreq = 2.4;
    s.look = null;
    await tween(s, { headTilt: 0, squint: 0, brow: 0 }, 0.4);
  }
  // Crocodiles bask with their mouths open. This one has sunglasses.
  async function bask() {
    await tween(s, { shades: 1 }, 0.6, E.bounce);
    say("croc.sun");
    s.glint = 0;
    await tween(s, { glint: 1 }, 0.45);
    await tween(s, { jaw: 0.45, sy: 0.95, squint: 0.3 }, 0.7);
    s.tailAmp = 3; s.tailFreq = 1.2;
    await sleep(3.2);
    s.tailAmp = 5; s.tailFreq = 2.4;
    await tween(s, { jaw: 0, sy: 1, squint: 0 }, 0.35);
    await tween(s, { shades: 0 }, 0.4, E.inQ);
  }
  // Dives, pops up somewhere else with just its eyes out, stares, climbs out.
  async function peekaboo() {
    chatter("croc.splash", 0.4);
    await dive();
    s.x = farX();
    await sleep(0.6);
    bubble(at(290, WATER).x);
    await sleep(0.45);
    await surface();
    s.look = { x: 0, y: 0.25 };
    await sleep(1.3);
    await tween(s, { lift: eyesLift - 5 * k }, 0.25);
    await tween(s, { lift: eyesLift }, 0.25);
    s.look = null;
    await sleep(0.4);
    await emerge();
  }

  async function eatBrick(b, fromVisitor) {
    if (s.lift > 1) await land();
    await settle(0.15);
    exclaim();
    s.lookAt = { x: b.x, y: -b.h };
    await tween(s, { brow: 1 }, 0.12);
    await sleep(0.3);
    // Approach from the side it is already on, unless the brick is too
    // close to that end of the photo to reach from there.
    var reach = 178 * k;
    var fromLeft = centreX() < b.x;
    var x = fromLeft ? b.x - CW / 2 - reach : b.x - CW / 2 + reach;
    if (x < minX || x > maxX) {
      fromLeft = !fromLeft;
      x = fromLeft ? b.x - CW / 2 - reach : b.x - CW / 2 + reach;
    }
    x = clamp(x, minX, maxX);
    var dir = fromLeft ? 1 : -1;
    if (inWater()) {
      await swimTo(x, 170, dir);
      while (brick === b && b.state === "fall") await sleep(0.05);
      await sleep(0.25);
      // The ambush: sink a touch, then burst up jaws-first.
      await tween(s, { lift: eyesLift - 10 * k }, 0.16, E.inQ);
      splash(b.x, 0.9);
      s.wet = 0;
      await tween(s, { lift: 14 * k, tilt: -12, jaw: 1 }, 0.2, E.outQ);
      await tween(s, { jaw: 0 }, 0.07, E.inQ);
      s.kick = 1;
      gulp(b);
      if (fromVisitor) say("croc.yum", true);
      await sleep(0.18);
      await tween(s, { lift: eyesLift, tilt: 0 }, 0.3, E.inQ);
      s.wet = 1;
      splash(centreX(), 0.6);
      s.lookAt = null;
      bubble(at(390, WATER).x, true);
      await happy(0.6, true);
      await emerge();
    } else {
      await walkTo(x, 190, dir);
      while (brick === b && b.state === "fall") await sleep(0.05);
      await tween(s, { headTilt: 15, jaw: 0.95 }, 0.2, E.outQ);
      await tween(s, { x: clamp(s.x + dir * 6 * sc, minX, maxX) }, 0.06);
      await tween(s, { jaw: 0 }, 0.07, E.inQ);
      s.kick = 1;
      gulp(b);
      if (fromVisitor) say("croc.yum", true);
      s.lookAt = null;
      await tween(s, { headTilt: 0 }, 0.25, E.outQ);
      await chew();
      later(0.5, burp);
      await happy(1.1, true);
    }
  }

  // Clicking the crocodile: a front flip, a giggle, or a show of teeth.
  var pokes = 0;
  async function poke() {
    s.poking = true;
    if (inWater()) {
      await leapOut(50);
      await happy(0.8, true);
      return;
    }
    if (s.lift > 1) await land();
    await settle(0.12);
    var apex = Math.min(maxLift, 110 * sc);
    var trick = pokes++ % 3;
    if (trick === 0 && apex > 40) {
      await tween(s, { sy: 0.82, sx: 1.08 }, 0.14, E.outQ);
      s.tuck = 1;
      await Promise.all([
        tween(s, { spin: 360 }, 0.7),
        (async function () {
          await tween(s, { lift: apex, sy: 1.06, sx: 0.96 }, 0.36, E.outQ);
          await tween(s, { lift: 0, sy: 1, sx: 1 }, 0.34, E.inQ);
        })()
      ]);
      s.spin = 0; s.tuck = 0;
      splash(centreX(), 0.55);
      say("croc.again", true);
      await squash();
      await happy(0.9, true);
    } else if (trick === 1) {
      say("croc.giggle", true);
      s.tailAmp = 15; s.tailFreq = 12;
      heart(0); heart(0.25);
      await tween(s, { squint: 1, brow: 1 }, 0.12);
      for (var i = 0; i < 3; i++) {
        await tween(s, { hop: 10 * sc }, 0.1, E.outQ);
        await tween(s, { hop: 0 }, 0.1, E.inQ);
      }
      await sleep(0.4);
      await tween(s, { squint: 0, brow: 0 }, 0.25);
    } else {
      s.look = { x: 0, y: 0.2 };
      await snap(3);
      say("croc.again", true);
      await happy(0.6, false);
    }
  }

  /* ── its life ─────────────────────────────────────────────
     Pick something to do, do it, rest, again. Weights keep it mostly
     strolling, with the showier moves now and then and never twice in a
     row. The cooldowns are clock times: the sunglasses and the free brick
     wait a while before they come back. */
  var ACTS = {
    stroll: { w: 5, go: function () { return walkTo(farX(), rand(70, 110)); } },
    snap: { w: 2, go: async function () { s.look = { x: 0.6, y: 0.1 }; await snap(2); } },
    kids: { w: 2, go: lookKids },
    swim: { w: 2, go: async function () {
      chatter("croc.splash", 0.4);
      await dive();
      await sleep(rand(0.5, 1));
      bubble(at(290, WATER).x);
      await sleep(0.4);
      await swimTo(farX(), rand(70, 95));
      await sleep(0.3);
      await leapOut();
      await shakeOff();
    } },
    peek: { w: 1.5, go: peekaboo },
    bask: { w: 1.2, after: 22, every: 50, go: bask },
    brick: { w: 1.2, after: 14, every: 40, go: async function () {
      var b = dropBrick(rand(0.15, 0.85) * W);
      if (!b) return;
      await eatBrick(b, false);
      // The moment to teach the trick: it just ate one, and can ask for more.
      say(seen.fed ? "croc.sky" : "croc.feed", true);
    } }
  };
  var lastAct = "", introDone = false;

  function choose() {
    var names = [], total = 0;
    Object.keys(ACTS).forEach(function (n) {
      var a = ACTS[n];
      if (n === lastAct || (a.after && clock < a.after) || (n === "brick" && brick)) return;
      names.push(n);
      total += a.w;
    });
    var r = Math.random() * total;
    for (var i = 0; i < names.length; i++) {
      r -= ACTS[names[i]].w;
      if (r <= 0) break;
    }
    var pick = names[Math.min(i, names.length - 1)];
    if (ACTS[pick].every) ACTS[pick].after = clock + ACTS[pick].every;
    lastAct = pick;
    return ACTS[pick];
  }

  async function intro() {
    s.lift = hiddenLift;
    s.x = rand(minX, maxX);
    s.dir = s.turn = Math.random() < 0.5 ? 1 : -1;
    await sleep(1.1);
    for (var i = 0; i < 3; i++) {
      bubble(at(290, WATER).x + rand(-12, 12) * sc);
      await sleep(0.35);
    }
    await surface();
    s.look = { x: -0.9, y: 0 };
    await sleep(0.5);
    s.look = { x: 0.9, y: 0 };
    await sleep(0.5);
    s.look = null;
    await swimTo(farX(), 90);
    await leapOut(60);
    await shakeOff();
    say("croc.hello", true);
    await happy(0.6, false);
  }

  async function life() {
    if (!introDone) { introDone = true; await intro(); }
    for (;;) {
      if (inWater()) {
        await swimTo(farX(), 85);
        await leapOut();
        await shakeOff();
      } else if (s.lift > 1) {
        await land();
      }
      await settle();
      await choose().go();
      hint();
      s.look = Math.random() < 0.5 ? { x: 0, y: 0.2 } : null;
      await sleep(rand(1, 2.4));
      s.look = null;
    }
  }

  /* ── start ────────────────────────────────────────────── */
  measure();
  lastX = s.x;

  if (STILL) {
    // Sitting on the edge at the right-hand end, looking towards the text.
    var still = function () { measure(); s.x = maxX; s.dir = s.turn = -1; s.look = { x: 0.2, y: 0.1 }; s.px = 0.2; s.py = 0.1; render(); };
    still();
    if ("ResizeObserver" in window) new ResizeObserver(still).observe(visual);
    return;
  }

  visual.classList.add("has-croc");
  s.lift = hiddenLift;
  render();

  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () { measure(); });
    ro.observe(visual);
    ro.observe(hero);
  }
  window.addEventListener("resize", measure);

  hero.addEventListener("pointermove", function (e) {
    var r = visual.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.t = clock;
  }, { passive: true });
  hero.addEventListener("pointerleave", function () { ptr.t = -9; });

  crocEl.addEventListener("click", function (e) {
    e.stopPropagation();
    remember("poked");
    if (!s.poking) run(poke);
  });
  photo.addEventListener("click", function (e) {
    if (brick) return;
    remember("fed");
    var b = dropBrick(e.clientX - visual.getBoundingClientRect().left);
    if (b) run(function () { return eatBrick(b, true); });
  });
  // With a mouse, pointing at either one is the cue to say what it does.
  if (!TOUCH) {
    crocEl.addEventListener("pointerenter", function () { if (!seen.poked) say("croc.poke"); });
    var dropHinted = false;
    photo.addEventListener("pointerenter", function () {
      if (!seen.fed && !dropHinted && say("croc.dropIt")) dropHinted = true;
    });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      wake();
    }).observe(hero);
  }

  run(life);
  wake();
})();
