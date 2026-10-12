/* ============================================================
   CRD — site behaviour: language, navigation, reveal, form.
   ============================================================ */
(function () {
  "use strict";

  var DICT = window.CRD_I18N || {};
  var SUPPORTED = ["en", "fr", "ar"];
  var RTL = ["ar"];
  var STORAGE_KEY = "crd-lang";
  var lang = "en";

  /* Who the page is speaking to: "brand" or "retail". The inline script in
     the head has already picked it, before first paint; see applyAudience(). */
  var AUDIENCE_KEY = "crd-audience";
  var AUDIENCES = ["brand", "retail"];
  var audience = document.documentElement.getAttribute("data-audience") || "brand";

  /* ── language ────────────────────────────────────────── */

  // An "@<audience>" variant of a key wins over the plain key, so only the
  // copy that differs between the two versions has to be written twice.
  function t(key) {
    var table = DICT[lang] || DICT.en || {};
    var own = key + "@" + audience;
    if (Object.prototype.hasOwnProperty.call(table, own)) return table[own];
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key;
  }

  function applyLang(next) {
    if (SUPPORTED.indexOf(next) === -1) next = "en";
    lang = next;

    document.documentElement.lang = lang;
    // Arabic reads right to left; the stylesheet uses logical properties, so
    // flipping this one attribute mirrors the layout.
    document.documentElement.dir = RTL.indexOf(lang) !== -1 ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = t(el.getAttribute("data-i18n"));
      // A handful of strings carry inline <strong>; everything else is plain text.
      if (el.tagName === "META" || el.tagName === "TITLE") {
        if (el.tagName === "META") el.setAttribute("content", value);
        else el.textContent = value;
      } else if (value.indexOf("<") !== -1) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
    });

    // The contact form relabels itself per audience, so re-apply after a swap.
    applyEnquiryType();

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      var on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });

    // Any validation messages on screen are now in the wrong language.
    clearFormErrors();

    // New labels, new widths: re-seat the audience pill. (A no-op on the very
    // first call, which runs before the pill has been looked up.)
    placePill();
  }

  // The inline script in the head has already chosen the language and set
  // lang/dir on <html>, before first paint, so an Arabic visit never shows a
  // left-to-right page first. Its order: stored choice, browser language,
  // then French for retailers and English for brand owners.
  function initialLang() {
    var chosen = document.documentElement.getAttribute("lang");
    return SUPPORTED.indexOf(chosen) !== -1 ? chosen : "en";
  }

  document.querySelectorAll(".lang-switch button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang");
      applyLang(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    });
  });

  applyLang(initialLang());

  /* ── header + mobile nav ─────────────────────────────── */

  var header = document.getElementById("siteHeader");
  var nav = document.getElementById("siteNav");
  var navToggle = document.getElementById("navToggle");

  function closeNav() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeNav();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 960) closeNav();
  });

  var onScroll = function () {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Anchor landing positions are handled in CSS via scroll-padding-top and a
     negative scroll-margin-top on each section — see "anchor landing" there.
     Doing it natively keeps direct links, back/forward and keyboard nav
     consistent with clicks. */

  /* ── scrollspy ───────────────────────────────────────── */

  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]:not(.btn)'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ── scroll reveal ───────────────────────────────────── */

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !document.documentElement.classList.contains("motion-on"); // ?motion=on, see <head>

  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".section-head, .about-grid, .cat, .why-card, .logo-wall li, .value-grid li, .next-steps, .contact-grid > *"
    );
    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (Math.min(i % 6, 5) * 55) + "ms";
    });

    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    targets.forEach(function (el) { revealer.observe(el); });
  }

  /* ── contact form ────────────────────────────────────── */

  var form = document.getElementById("contactForm");
  var statusEl = document.getElementById("formStatus");
  var submitBtn = document.getElementById("submitBtn");
  var typeSelect = document.getElementById("f-type");

  /* A retailer in Tunis and a brand owner in Germany need different questions:
     asking a Sousse toy shop for its "brand" and "country" is noise. */
  function applyEnquiryType() {
    if (!typeSelect) return;
    var isRetailer = typeSelect.value === "retailer";

    [["wrap-brand", "f-brand"], ["wrap-country", "f-country"]].forEach(function (pair) {
      document.getElementById(pair[0]).hidden = isRetailer;
      // Don't submit values from fields the sender can no longer see.
      if (isRetailer) document.getElementById(pair[1]).value = "";
    });

    var companyLabel = document.querySelector('label[for="f-company"]');
    companyLabel.textContent = t(isRetailer ? "form.companyShop" : "form.company");

    var message = document.getElementById("f-message");
    message.setAttribute("placeholder", t(isRetailer ? "form.messagePhRetail" : "form.messagePh"));
  }

  if (typeSelect) {
    typeSelect.addEventListener("change", applyEnquiryType);
    // Start the form on the visitor's side rather than on whatever the
    // browser restored from a previous visit.
    typeSelect.value = audience === "retail" ? "retailer" : "brand";
    applyEnquiryType();
  }

  // "Request our range & terms" should land on the form already set to retailer.
  document.querySelectorAll("[data-set-enquiry]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (!typeSelect) return;
      typeSelect.value = link.getAttribute("data-set-enquiry");
      applyEnquiryType();
    });
  });

  /* ── audience ────────────────────────────────────────── */

  /* One page, two versions. Switching rewrites it in place: CSS shows the
     elements tagged data-for this audience, applyLang() re-resolves every
     "@retail" copy variant, and the form moves to the matching side. */
  var AUDIENCE_PARAM = { brand: "marques", retail: "revendeurs" };

  function markAudienceButtons() {
    document.querySelectorAll("[data-audience-set]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-audience-set") === audience));
    });
  }

  function applyAudience(next) {
    if (AUDIENCES.indexOf(next) === -1) next = "brand";
    audience = next;
    document.documentElement.setAttribute("data-audience", next);
    markAudienceButtons();

    if (typeSelect) typeSelect.value = next === "retail" ? "retailer" : "brand";
    applyLang(lang); // also re-runs applyEnquiryType()

    try { localStorage.setItem(AUDIENCE_KEY, next); } catch (e) { /* private mode */ }

    // Keep the address bar in step, so a link copied now opens this version.
    if (window.history && history.replaceState) {
      var url = new URL(location.href);
      url.searchParams.set("pour", AUDIENCE_PARAM[next]);
      history.replaceState(null, "", url);
    }
  }

  /* The pill: a white shape that slides under the active option. The two
     options are not the same width, and both change with the language, so it
     is measured rather than styled. Until the first measurement the CSS falls
     back to a plain white button; see .has-pill in styles.css. */
  var audSwitch = document.querySelector(".audience-switch");
  var pill = audSwitch && audSwitch.querySelector(".audience-pill");

  function placePill(btn) {
    if (!pill) return;
    btn = btn || audSwitch.querySelector('[aria-pressed="true"]');
    if (!btn || !btn.offsetWidth) return;
    // Sub-pixel rects rather than offset*, which round and left the pill a
    // pixel off. Relative to the switch's padding box, where left/top 0 sit.
    var s = audSwitch.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    audSwitch.style.setProperty("--pill-x", (b.left - s.left - audSwitch.clientLeft) + "px");
    audSwitch.style.setProperty("--pill-y", (b.top - s.top - audSwitch.clientTop) + "px");
    audSwitch.style.setProperty("--pill-w", b.width + "px");
    audSwitch.style.setProperty("--pill-h", b.height + "px");
    if (!audSwitch.classList.contains("has-pill")) {
      audSwitch.classList.add("has-pill");
      // Let the first position paint before transitions switch on, or the
      // pill would slide in from the left edge on page load.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { audSwitch.classList.add("pill-animate"); });
      });
    }
  }

  /* Changing audience: the pill and the labels move on the click itself; the
     hero copy fades out, is swapped by applyAudience() while invisible, then
     fades back in. Each click cancels a change still waiting, so rapid
     toggling settles on the last choice and never strands the hero faded. */
  var hero = document.querySelector(".hero");
  var FADE_OUT_MS = 180; // matches .hero.is-swapping in styles.css
  var pendingAudience = null;
  var swapTimer = null;

  function switchAudience(next) {
    if (next === (pendingAudience || audience)) return;

    document.querySelectorAll("[data-audience-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-audience-set") === next));
    });
    placePill(audSwitch && audSwitch.querySelector('[data-audience-set="' + next + '"]'));

    if (reduceMotion || !hero) { applyAudience(next); return; }

    pendingAudience = next;
    hero.classList.add("is-swapping");
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () {
      applyAudience(pendingAudience);
      pendingAudience = null;
      requestAnimationFrame(function () { hero.classList.remove("is-swapping"); });
    }, FADE_OUT_MS);
  }

  document.querySelectorAll("[data-audience-set]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchAudience(btn.getAttribute("data-audience-set"));
    });
  });
  markAudienceButtons();
  placePill();

  // Button widths change when the web font arrives, with the language, and at
  // the mobile breakpoint; all of those resize the switch.
  if (audSwitch && "ResizeObserver" in window) {
    new ResizeObserver(function () { placePill(); }).observe(audSwitch);
  }

  // Arriving through a ?pour= link counts as a choice: remember it, so the
  // plain address opens the same version next time.
  if (new URLSearchParams(location.search).get("pour")) {
    try { localStorage.setItem(AUDIENCE_KEY, audience); } catch (e) { /* private mode */ }
  }

  function clearFormErrors() {
    if (!form) return;
    form.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
    form.querySelectorAll(".field-error").forEach(function (m) { m.remove(); });
  }

  function setError(input, messageKey) {
    var field = input.closest(".field");
    if (!field || field.querySelector(".field-error")) return;
    field.classList.add("has-error");
    var msg = document.createElement("span");
    msg.className = "field-error";
    msg.textContent = t(messageKey);
    field.appendChild(msg);
  }

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.classList.remove("is-ok", "is-err");
    if (kind) statusEl.classList.add(kind);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearFormErrors();
      setStatus("", null);

      var invalid = null;

      form.querySelectorAll("[required]").forEach(function (input) {
        if (!input.value.trim()) {
          setError(input, "form.required");
          if (!invalid) invalid = input;
        }
      });

      var email = form.querySelector('[name="email"]');
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        setError(email, "form.badEmail");
        if (!invalid) invalid = email;
      }

      if (invalid) { invalid.focus(); return; }

      var data = Object.fromEntries(new FormData(form).entries());
      data.language = lang;

      submitBtn.disabled = true;
      submitBtn.textContent = t("form.sending");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (json) {
          if (json && json.success) {
            form.reset();
            setStatus(t("form.ok"), "is-ok");
          } else {
            setStatus(t("form.err"), "is-err");
          }
        })
        .catch(function () {
          setStatus(t("form.err"), "is-err");
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = t("form.submit");
        });
    });
  }

  /* ── brand carousel ──────────────────────────────────── */

  /* The brands wrap into rows now rather than scrolling sideways, so the
     drag-to-scroll that used to live here has been removed: it had nothing
     left to scroll, and it disabled pointer events on the cards as soon as
     the mouse went down, which stopped the brand links from ever opening. */
  var track = document.getElementById("brandTrack");

  if (track) {
    /* Written as a custom property, not as z-index directly: an inline
       z-index would outrank the stylesheet and the :hover rule could never
       bring a card to the front. */
    var tiles = Array.prototype.slice.call(track.children);
    tiles.forEach(function (tile, i) {
      tile.style.setProperty("--z", String(tiles.length - i));
    });
  }

  /* The contact map is a plain Google Maps embed in the markup — no library,
     no API key, no JavaScript needed here. */

  /* ── footer year ─────────────────────────────────────── */

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
